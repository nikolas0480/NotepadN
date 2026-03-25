import { Command } from '@tauri-apps/plugin-shell';

async function test() {
    const result = await Command.create('echo', ['hello']).execute();
    console.log(result);
}
test();
