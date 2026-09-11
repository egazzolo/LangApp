import { useEffect, useState } from 'react';
import { gradeItem, studentBTurn, type ActivityDocument, type ActivityItem } from '@/domain/activities';
export default function ActivityPreview({document:doc}:{document:ActivityDocument}){
  const [answers,setAnswers]=useState<Record<string,unknown>>({});
  const [feedback,setFeedback]=useState<Record<string,string>>({});
  const [turns,setTurns]=useState<Record<string,string[]>>({});
  useEffect(()=>{setAnswers({});setFeedback({});setTurns({});},[doc]);
  const answer=(id:string,value:unknown)=>setAnswers(a=>({...a,[id]:value}));
  const part=(id:string,key:string,value:string)=>answer(id,{...(answers[id] as Record<string,string>??{}),[key]:value});
  const check=(id:string)=>{const result=gradeItem(doc,id,answers[id]);setFeedback(f=>({...f,[id]:result.correct===null?'Teacher review required.':result.correct?'Correct.':'Try again.'}));};
  function render(item:ActivityItem){
    if(item.kind==='multiple_choice')return item.options.map(o=><label className="al-option" key={o.id}><input type="radio" name={item.id} checked={answers[item.id]===o.id} onChange={()=>answer(item.id,o.id)}/>{o.text}</label>);
    if(item.kind==='fill_blank')return <div className="al-inline-blanks">{item.prompt.split(/(\{\{[a-z][a-z0-9_-]*\}\})/g).map((piece,i)=>piece.startsWith('{{')?<input key={i} aria-label={piece.slice(2,-2)} value={(answers[item.id] as Record<string,string>)?.[piece.slice(2,-2)]??''} onChange={e=>part(item.id,piece.slice(2,-2),e.target.value)}/>:<span key={i}>{piece}</span>)}</div>;
    if(item.kind==='matching'||item.kind==='categorization'){
      const entries=item.kind==='matching'?item.left:item.entries,options=item.kind==='matching'?item.right:item.categories;
      return entries.map(entry=><label className="al-match" key={entry.id}><span>{entry.text}</span><select value={(answers[item.id] as Record<string,string>)?.[entry.id]??''} onChange={e=>part(item.id,entry.id,e.target.value)}><option value="">Choose…</option>{options.map(o=><option key={o.id} value={o.id}>{o.text}</option>)}</select></label>);
    }
    if(item.kind==='ordering')return item.tokens.map((_,i)=><label className="al-match" key={i}><span>Position {i+1}</span><select value={(answers[item.id] as string[])?.[i]??''} onChange={e=>{const order=[...((answers[item.id] as string[])??Array(item.tokens.length).fill(''))];order[i]=e.target.value;answer(item.id,order);}}><option value="">Choose…</option>{item.tokens.map(o=><option key={o.id} value={o.id}>{o.text}</option>)}</select></label>);
    if(item.kind==='transformation')return <><blockquote>{item.source}</blockquote><input aria-label="Transformed sentence" value={String(answers[item.id]??'')} onChange={e=>answer(item.id,e.target.value)}/></>;
    if(item.kind==='open_response')return <textarea aria-label="Your response" value={String(answers[item.id]??'')} onChange={e=>answer(item.id,e.target.value)} rows={4}/>;
    return <div><p className="al-muted">You are Student A · Ferson is Student B</p><table><tbody>{item.facts.map(f=><tr key={f.id}><th>{f.label}</th><td>{f.a??'Ask Ferson'}</td></tr>)}</tbody></table>
      {item.questions.map(q=><button className="al-secondary" key={q.id} onClick={()=>{const turn=studentBTurn(doc,item.id,q.id);setTurns(t=>({...t,[item.id]:[...(t[item.id]??[]),q.asker==='A'?'You: '+q.prompt:'', 'Ferson: '+turn.text].filter(Boolean)}));}}>{q.asker==='A'?'Ask: '+q.prompt:'Let Ferson ask a question'}</button>)}
      <div className="al-turns" aria-live="polite">{(turns[item.id]??[]).map((t,i)=><p key={i}>{t}</p>)}</div><textarea aria-label="Your answer to Ferson" placeholder="Practise your reply…" rows={2}/></div>;
  }
  return <div className="al-preview"><h2>{doc.metadata.title}</h2><p>{doc.objective}</p>{doc.stages.map((stage,index)=><section key={stage.id}><div className="al-stage"><span>{index+1}</span><h3>{stage.title}</h3></div><p>{stage.instructions}</p>{stage.items.map(item=><article className="al-exercise" key={item.id}><span className="al-kicker">{item.kind.replaceAll('_',' ')}</span>{item.kind!=='fill_blank'&&<p>{item.prompt}</p>}{render(item)}<div className="al-check"><button className="al-secondary" onClick={()=>check(item.id)}>Check response</button><span role="status">{feedback[item.id]}</span></div></article>)}</section>)}</div>;
}
