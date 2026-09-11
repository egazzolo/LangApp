import type { ActivityDocument } from '@/domain/activities';
export default function AnswerEditor({document:doc,onChange,readOnly}:{document:ActivityDocument;onChange:(d:ActivityDocument)=>void;readOnly:boolean}){
  const change=(fn:(d:ActivityDocument)=>void)=>{const next=structuredClone(doc);fn(next);onChange(next);};
  return <div className="al-editor"><p className="al-note">Private answer key. This panel is never served to learners.</p>{doc.answerKey.map((k,index)=><fieldset key={k.itemId} disabled={readOnly}><legend>{k.itemId}</legend>
    {['multiple_choice','transformation'].includes(doc.stages.flatMap(s=>s.items).find(i=>i.id===k.itemId)?.kind??'')&&<label className="al-field"><span>Accepted responses / option ID (one per line)</span><textarea value={k.accepted.join('\n')} onChange={e=>change(d=>{d.answerKey[index]!.accepted=e.target.value.split('\n').filter(Boolean);})}/></label>}
    {k.parts.map((p,pi)=><label className="al-field" key={p.id}><span>{p.id} · accepted values / target IDs</span><textarea rows={2} value={p.accepted.join('\n')} onChange={e=>change(d=>{d.answerKey[index]!.parts[pi]!.accepted=e.target.value.split('\n').filter(Boolean);})}/></label>)}
    {k.order.length>0&&<label className="al-field"><span>Correct order (comma-separated token IDs)</span><input value={k.order.join(', ')} onChange={e=>change(d=>{d.answerKey[index]!.order=e.target.value.split(',').map(v=>v.trim()).filter(Boolean);})}/></label>}
    <label className="al-field"><span>Teacher-review rubric</span><textarea value={k.rubric} onChange={e=>change(d=>{d.answerKey[index]!.rubric=e.target.value;})}/></label>
  </fieldset>)}</div>;
}
