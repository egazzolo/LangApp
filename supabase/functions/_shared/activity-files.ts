export const sourceTypes: Record<string,string> = {
  pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt:'text/plain',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',
};
export function sourceMime(filename:string) { return sourceTypes[filename.toLowerCase().split('.').at(-1)??''] ?? null; }
export function checkSource(filename:string, bytes:Uint8Array) {
  const mime=sourceMime(filename);
  if(!mime || !bytes.length || bytes.length>10485760)throw new Error('INVALID_SOURCE');
  const start=new TextDecoder().decode(bytes.slice(0,12));
  const valid=mime==='application/pdf'?start.startsWith('%PDF-')
    :mime.includes('wordprocessingml')?bytes[0]===0x50&&bytes[1]===0x4b
    :mime==='image/png'?bytes[0]===137&&start.slice(1,4)==='PNG'
    :mime==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255
    :mime==='image/webp'?start.startsWith('RIFF')&&start.slice(8,12)==='WEBP'
    :!bytes.includes(0);
  if(!valid)throw new Error('INVALID_FILE_SIGNATURE');
  return mime;
}
