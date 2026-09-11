import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { encodingFor } from './policy.mjs';
const dir = mkdtempSync(join(tmpdir(),'codec-check-'));
try {
  const input=join(dir,'input.wav');
  execFileSync('ffmpeg',['-nostdin','-loglevel','error','-f','lavfi','-i','sine=frequency=440:duration=1','-y',input]);
  for(const ext of ['mp3','m4a','webm','wav']) {
    const output=join(dir,'output.'+ext);
    execFileSync('ffmpeg',['-nostdin','-loglevel','error','-protocol_whitelist','file,pipe','-i',input,'-map','0:a:0','-vn','-map_metadata','-1','-ac','1','-ar','16000',...encodingFor(output).args,'-y',output]);
    const info=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',output],{encoding:'utf8'}));
    assert.equal(info.streams[0].channels,1);
    assert.ok(Number(info.format.duration)>=1);
    assert.ok(statSync(output).size < statSync(input).size);
  }
  console.log('All audio containers transcode and remain playable.');
} finally {rmSync(dir,{recursive:true,force:true});}
