import os
import sys
import json
import psycopg2

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from src.worker.wrapper_generator import WrapperGenerator

def get_db_connection():
    return psycopg2.connect(
        dbname="kodechirp",
        user="kodechirp",
        password="ritam123",
        host="localhost",
        port="5433"
    )

def validate():
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT id, title, slug, judge_mode, signature_metadata, status, reference_solution_id FROM problems")
    problems = cur.fetchall()
    
    print("=" * 80)
    print(f"{'ID':<38} | {'Title':<20} | Status")
    print("=" * 80)
    
    for p in problems:
        p_id, title, slug, judge_mode, sig_meta, status, ref_id = p
        
        # Boilerplates
        cur.execute("SELECT language FROM problem_templates WHERE problem_id = %s", (p_id,))
        templates = cur.fetchall()
        boilerplates = [t[0] for t in templates]
        
        # Reference Solution
        cur.execute("SELECT compile_status, source_code, language FROM reference_solutions WHERE id = %s", (ref_id,))
        ref = cur.fetchone()
        ref_status = "N/A"
        ref_code = ""
        ref_lang = ""
        if ref:
            ref_status = ref[0]
            ref_code = ref[1]
            ref_lang = ref[2]
            
        # Tests
        cur.execute("SELECT is_sample FROM test_cases WHERE problem_id = %s", (p_id,))
        tests = cur.fetchall()
        visible = sum(1 for t in tests if t[0])
        hidden = sum(1 for t in tests if not t[0])
        
        # Wrapper generation
        wrapper_status = "Skipped"
        if judge_mode == "FUNCTION" and sig_meta:
            try:
                WrapperGenerator.generate("python", sig_meta, ref_code)
                wrapper_status = "Success"
            except Exception as e:
                wrapper_status = f"Failed: {e}"
                
        # Execution status
        exec_status = "Verified" if ref_status == 'verified' else "Not Verified"
        
        # Validator status
        # In current KodeChirp V3, no explicit validator schema exists. 
        # The schema uses "is_sample" tests and robust constraints JSON.
        validator_status = "N/A (Schema Implicit)"
        
        # Publish readiness
        ready = True
        issues = []
        if not boilerplates:
            ready = False
            issues.append("No boilerplates")
        if ref_status != 'verified':
            ready = False
            issues.append("Ref solution not verified")
        if visible < 1:
            ready = False
            issues.append("No visible tests")
        if hidden < 1:
            ready = False
            issues.append("No hidden tests")
        if wrapper_status != "Success":
            ready = False
            issues.append("Wrapper generation failed")
            
        readiness = "READY" if ready and status == 'Published' else f"NOT READY ({', '.join(issues)})"
        
        print(f"Problem: {title} ({p_id})")
        print(f"  Boilerplates      : {boilerplates}")
        print(f"  Reference Solution: {'Generated' if ref else 'Missing'} ({ref_status})")
        print(f"  Visible Tests     : {visible}")
        print(f"  Hidden Tests      : {hidden}")
        print(f"  Validator Status  : {validator_status}")
        print(f"  Wrapper Gen       : {wrapper_status}")
        print(f"  Execution Status  : {exec_status}")
        print(f"  Publish Readiness : {readiness}")
        print("-" * 80)
        
    cur.close()
    conn.close()

if __name__ == "__main__":
    validate()
