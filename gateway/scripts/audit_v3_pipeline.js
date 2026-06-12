require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');
const fs = require('fs');
const child_process = require('child_process');
const pool = new Pool({
  connectionString: 'postgresql://kodechirp:ritam123@localhost:5433/kodechirp'
});

const API_URL = 'http://localhost:4000/api';

async function waitForSubmission(submissionId) {
    for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 1000));
        let res = await fetch(`${API_URL}/submissions/${submissionId}`);
        let data = await res.json();
        if (!data.success) throw new Error(data.error || "Failed to fetch submission");
        let status = data.data.status;
        if (status !== 'queued' && status !== 'running' && status !== 'Pending' && status !== 'Running') {
            return data.data;
        }
    }
    throw new Error('Submission timed out');
}

async function audit() {
    console.log("Starting V3 Pipeline Verification Audit\n");
    let report = [];

    try {
        const probRes = await pool.query("SELECT * FROM problems WHERE status = 'Published'");
        
        for (let prob of probRes.rows) {
            let pid = prob.id;
            let title = prob.title;
            let details = { "Problem ID": pid, "Title": title, "Status": prob.status };
            
            console.log(`\nAuditing Problem: ${title}`);
            
            // Database Checks
            let tcRes = await pool.query("SELECT * FROM test_cases WHERE problem_id = $1", [pid]);
            let visible = tcRes.rows.filter(r => r.is_sample).length;
            let hidden = tcRes.rows.filter(r => !r.is_sample).length;
            details["Visible test count"] = visible;
            details["Hidden test count"] = hidden;

            // Verify test case integrity
            let testsValid = true;
            for (let tc of tcRes.rows) {
                try {
                    let inp = typeof tc.input_json === 'string' ? JSON.parse(tc.input_json) : tc.input_json;
                    let exp = typeof tc.expected_json === 'string' ? JSON.parse(tc.expected_json) : tc.expected_json;
                    if (!inp || exp === undefined) throw new Error("Missing JSON fields");
                } catch (e) {
                    testsValid = false;
                    console.log(`JSON parse error on test ${tc.id}: ${e}`);
                }
            }
            details["Test Cases Integrity"] = testsValid ? "Pass" : "Fail";
            
            // Reference Solution
            let refRes = await pool.query("SELECT * FROM reference_solutions WHERE id = $1", [prob.reference_solution_id]);
            if (refRes.rows.length === 0) {
                details["Reference solution ID"] = "Missing";
            } else {
                let ref = refRes.rows[0];
                details["Reference solution ID"] = `${ref.id} (${ref.compile_status})`;
                
                // Wrapper Gen
                let pycode = `
import sys, json, os
sys.path.append(os.path.abspath(os.path.join('${__dirname}', '../../workers')))
from src.worker.wrapper_generator import WrapperGenerator
try:
    sig = json.loads('${JSON.stringify(prob.signature_metadata)}')
    WrapperGenerator.generate("python", sig, """${ref.source_code}""")
    print("Success")
except Exception as e:
    print("Failed: " + str(e))
`;
                fs.writeFileSync(`/tmp/wrap_${pid}.py`, pycode);
                let wrapRes = child_process.execSync(`python3 /tmp/wrap_${pid}.py`).toString().trim();
                details["Wrapper generation result"] = wrapRes;

                // API Simulation - Correct Answer
                try {
                    let subRes = await fetch(`${API_URL}/submissions/submit`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            code: ref.source_code,
                            language: "python",
                            problem_id: pid
                        })
                    });
                    let data = await subRes.json();
                    if (!data.success) throw new Error(data.error + (data.details ? ": " + JSON.stringify(data.details) : ""));
                    let subId = data.data.submissionId;
                    let finalResult = await waitForSubmission(subId);
                    details["AC simulation result"] = finalResult.status;
                } catch(e) {
                    details["AC simulation result"] = "Error: " + e.message;
                }
                
                // API Simulation - Wrong Answer
                try {
                    let waCode = "def " + prob.signature_metadata.name + "(*args): return None";
                    let subResWA = await fetch(`${API_URL}/submissions/submit`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            code: waCode,
                            language: "python",
                            problem_id: pid
                        })
                    });
                    let dataWA = await subResWA.json();
                    if (!dataWA.success) throw new Error(dataWA.error + (dataWA.details ? ": " + JSON.stringify(dataWA.details) : ""));
                    let finalResultWA = await waitForSubmission(dataWA.data.submissionId);
                    details["WA simulation result"] = finalResultWA.status;
                } catch (e) {
                     details["WA simulation result"] = "Error: " + e.message;
                }

                // API Simulation - Runtime Error
                try {
                    let reCode = "def " + prob.signature_metadata.name + "(*args): return 1/0";
                    let subResRE = await fetch(`${API_URL}/submissions/submit`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            code: reCode,
                            language: "python",
                            problem_id: pid
                        })
                    });
                    let dataRE = await subResRE.json();
                    if (!dataRE.success) throw new Error(dataRE.error + (dataRE.details ? ": " + JSON.stringify(dataRE.details) : ""));
                    let finalResultRE = await waitForSubmission(dataRE.data.submissionId);
                    details["RE simulation result"] = finalResultRE.status;
                } catch (e) {
                     details["RE simulation result"] = "Error: " + e.message;
                }
            }
            
            // Publish Validation using the real adminController (simulated via import if possible, but easier to just log the conditions)
            details["Publish validation result"] = (visible === 10 && hidden === 50 && details["AC simulation result"] === "Accepted") ? "PASS" : "FAIL";

            report.push(details);
            console.log(JSON.stringify(details, null, 2));
        }

        fs.writeFileSync('/home/ritam/.gemini/antigravity/brain/1fa8ad33-6fca-4739-aa81-e6414d716de5/audit_results.md', `# V3 Pipeline Verification Audit\n\n\`\`\`json\n${JSON.stringify(report, null, 2)}\n\`\`\`\n`);
        console.log("Audit complete. Artifact written.");
    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

audit();
