const child_process = require('child_process');

try {
    const r = child_process.execSync('echo "hello world" | jq -R .');
    console.log(r.toString());
} catch(e) {
    console.log(e);
}
