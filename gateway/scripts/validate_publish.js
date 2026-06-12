require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');
const child_process = require('child_process');
const fs = require('fs');

const pool = new Pool({
  connectionString: 'postgresql://kodechirp:ritam123@localhost:5433/kodechirp'
});

// Using python wrapper generator via command line just to test
function testWrapper(sig_meta, ref_code) {
    const pycode = `
import sys
import os
import json
sys.path.append(os.path.abspath(os.path.join('${__dirname}', '../../workers')))
from src.worker.wrapper_generator import WrapperGenerator

sig = json.loads('${JSON.stringify(sig_meta)}')
code = """${ref_code}"""
try:
    WrapperGenerator.generate("python", sig, code)
    print("Success")
except Exception as e:
    print("Failed: " + str(e))
`;
    fs.writeFileSync('/tmp/test_wrapper.py', pycode);
    try {
        const out = child_process.execSync('python3 /tmp/test_wrapper.py').toString().trim();
        return out;
    } catch(e) {
        return "Failed: Execution error";
    }
}

async function validate() {
  try {
    const res = await pool.query("SELECT id, title, slug, judge_mode, signature_metadata, status, reference_solution_id FROM problems");
    
    console.log("=".repeat(80));
    console.log(String("ID").padEnd(38) + " | " + String("Title").padEnd(20) + " | Status");
    console.log("=".repeat(80));
    
    for (let p of res.rows) {
        let p_id = p.id;
        let title = p.title;
        let judge_mode = p.judge_mode;
        let sig_meta = p.signature_metadata;
        let status = p.status;
        let ref_id = p.reference_solution_id;
        
        // Boilerplates
        let bRes = await pool.query("SELECT language FROM problem_templates WHERE problem_id = $1", [p_id]);
        let boilerplates = bRes.rows.map(r => r.language);
        
        // Reference
        let ref_status = "N/A";
        let ref_code = "";
        let ref_lang = "";
        let ref = null;
        if (ref_id) {
            let rRes = await pool.query("SELECT compile_status, source_code, language FROM reference_solutions WHERE id = $1", [ref_id]);
            if (rRes.rows.length > 0) {
                ref = rRes.rows[0];
                ref_status = ref.compile_status;
                ref_code = ref.source_code;
                ref_lang = ref.language;
            }
        }
        
        // Tests
        let tRes = await pool.query("SELECT is_sample FROM test_cases WHERE problem_id = $1", [p_id]);
        let visible = tRes.rows.filter(r => r.is_sample).length;
        let hidden = tRes.rows.filter(r => !r.is_sample).length;
        
        let wrapper_status = "Skipped";
        if (judge_mode === "FUNCTION" && sig_meta) {
            wrapper_status = testWrapper(sig_meta, ref_code);
        }
        
        let exec_status = ref_status === 'verified' ? 'Verified' : 'Not Verified';
        let validator_status = "N/A (Schema Implicit)";
        
        let ready = true;
        let issues = [];
        if (boilerplates.length === 0) { ready = false; issues.push("No boilerplates"); }
        if (ref_status !== 'verified') { ready = false; issues.push("Ref solution not verified"); }
        if (visible < 1) { ready = false; issues.push("No visible tests"); }
        if (hidden < 1) { ready = false; issues.push("No hidden tests"); }
        if (wrapper_status !== 'Success') { ready = false; issues.push("Wrapper generation failed"); }
        
        let readiness = ready && status === 'Published' ? "READY" : "NOT READY (" + issues.join(', ') + ")";
        
        console.log(`Problem: ${title} (${p_id})`);
        console.log(`  Boilerplates      : ${boilerplates.join(', ')}`);
        console.log(`  Reference Solution: ${ref ? 'Generated' : 'Missing'} (${ref_status})`);
        console.log(`  Visible Tests     : ${visible}`);
        console.log(`  Hidden Tests      : ${hidden}`);
        console.log(`  Validator Status  : ${validator_status}`);
        console.log(`  Wrapper Gen       : ${wrapper_status}`);
        console.log(`  Execution Status  : ${exec_status}`);
        console.log(`  Publish Readiness : ${readiness}`);
        console.log("-".repeat(80));
    }
  } catch (e) {
      console.error(e);
  } finally {
      pool.end();
  }
}

validate();
