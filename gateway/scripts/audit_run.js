const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://kodechirp:ritam123@localhost:5433/kodechirp'
});

async function run() {
  const res = await pool.query("SELECT id, title, signature_metadata FROM problems WHERE status = 'Published'");
  console.log("Found " + res.rows.length + " problems.");
  
  for (const p of res.rows) {
    const refRes = await pool.query("SELECT source_code, language FROM reference_solutions WHERE problem_id = $1", [p.id]);
    if (refRes.rows.length === 0) continue;
    
    const ref = refRes.rows[0];
    console.log(`\nTesting Problem: ${p.title} (${p.id}) in ${ref.language}`);
    
    // Test 1: AC
    console.log("  Submitting Reference Solution (Expected AC)...");
    let acSub = await submitAndWait(p.id, ref.language, ref.source_code);
    console.log(`  Result: ${acSub.status} (Passed: ${acSub.passed_test_cases}/${acSub.total_test_cases})`);
    
    // Test 2: WA
    console.log("  Submitting Wrong Solution (Expected WA)...");
    let waCode = ref.language === 'python' ? "def dummy(*args):\n    return None\n" + ref.source_code.replace(/def [a-zA-Z0-9_]+\(/g, "def old_func(") : ref.source_code + "\n// syntax or logic error\n";
    if(ref.language === 'python') {
        const funcNameMatch = p.signature_metadata.match(/"name":\s*"([^"]+)"/);
        if (funcNameMatch) {
            waCode += `\ndef ${funcNameMatch[1]}(*args):\n    return None\n`;
        }
    } else {
        const funcNameMatch = p.signature_metadata.match(/"name":\s*"([^"]+)"/);
        if (funcNameMatch) {
            waCode = `var ${funcNameMatch[1]} = function() { return null; };`;
        }
    }
    let waSub = await submitAndWait(p.id, ref.language, waCode);
    console.log(`  Result: ${waSub.status} (Passed: ${waSub.passed_test_cases}/${waSub.total_test_cases})`);
    
    // Test 3: CE / RE
    console.log("  Submitting Syntax Error (Expected CE or RE)...");
    let ceCode = "this is not valid code!! && &&";
    let ceSub = await submitAndWait(p.id, ref.language, ceCode);
    console.log(`  Result: ${ceSub.status}`);
  }
  pool.end();
}

async function submitAndWait(problem_id, language, code) {
  const reqRes = await fetch('http://localhost:4000/api/submissions/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ problem_id, language, code })
  });
  const reqData = await reqRes.json();
  if (!reqData.success) {
    return { status: 'Submit Error: ' + reqData.message };
  }
  
  const subId = reqData.submission.id;
  while(true) {
    await new Promise(r => setTimeout(r, 1000));
    const statusRes = await fetch(`http://localhost:4000/api/submissions/${subId}`);
    const statusData = await statusRes.json();
    if (!statusData.success) {
      return { status: 'Fetch Error' };
    }
    if (statusData.submission.status !== 'pending' && statusData.submission.status !== 'processing') {
      return statusData.submission;
    }
  }
}

run().catch(console.error);
