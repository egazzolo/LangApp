import type { ActivityDocument } from '@/domain/activities';
export default function ActivityEditor({document:doc,onChange,locked,readOnly}:{document:ActivityDocument;onChange:(doc:ActivityDocument)=>void;locked:boolean;readOnly:boolean}){
  const change=(fn:(next:ActivityDocument)=>void)=>{const next=structuredClone(doc);fn(next);onChange(next);};
  const field=(label:string,value:string,update:(value:string)=>void,disabled=false,multiline=false)=><label className="al-field"><span>{label}</span>{multiline?<textarea rows={3} disabled={readOnly||disabled} value={value} onChange={e=>update(e.target.value)}/>:<input disabled={readOnly||disabled} value={value} onChange={e=>update(e.target.value)}/>}</label>;
  return <div className="al-editor">
    {field('Title',doc.metadata.title,v=>change(d=>{d.metadata.title=v;}))}
    <div className="al-two">{(['language','level','skill','grammarPoint','category'] as const).map(name=><div key={name}>{field(name,doc.metadata[name],v=>change(d=>{(d.metadata as Record<string,string>)[name]=v;}),locked&&name!=='category')}</div>)}</div>
    {field('Learning objective',doc.objective,v=>change(d=>{d.objective=v;}),locked,true)}
    {field('Required forms (one per line)',doc.requiredForms.join('\n'),v=>change(d=>{d.requiredForms=v.split('\n').filter(Boolean);}),locked,true)}
    {doc.stages.map((stage,si)=><details key={stage.id} open><summary>Stage {si+1}: {stage.title}</summary>
      {field('Stage title',stage.title,v=>change(d=>{d.stages[si]!.title=v;}))}
      {field('Stage objective',stage.objective,v=>change(d=>{d.stages[si]!.objective=v;}),locked)}
      {field('Instructions',stage.instructions,v=>change(d=>{d.stages[si]!.instructions=v;}),false,true)}
      {stage.items.map((item,ii)=><div className="al-item-edit" key={item.id}><strong>{item.id} · {item.kind.replaceAll('_',' ')}</strong>
        {field('Prompt',item.prompt,v=>change(d=>{d.stages[si]!.items[ii]!.prompt=v;}),false,true)}
        {item.kind==='transformation'&&field('Source sentence',item.source,v=>change(d=>{const x=d.stages[si]!.items[ii]!;if(x.kind==='transformation')x.source=v;}))}
        {(['options','left','right','tokens','entries','categories'] as const).flatMap(group=>{
          const entries=(item as unknown as Record<string,{id:string;text:string}[]>)[group];
          return entries?entries.map((o,oi)=><div key={group+o.id}>{field(group+' · '+o.id,o.text,v=>change(d=>{const list=(d.stages[si]!.items[ii] as unknown as Record<string,{id:string;text:string}[]>)[group];list![oi]!.text=v;}))}</div>):[];
        })}
        {item.forms.map((f,fi)=><div key={fi}>{field('Evidence for '+f.form,f.evidence,v=>change(d=>{d.stages[si]!.items[ii]!.forms[fi]!.evidence=v;}))}</div>)}
        {item.kind==='information_gap'&&<><p className="al-note">Student B values are private. The gap pattern is locked after approval.</p>{item.facts.map((f,fi)=><div className="al-two" key={f.id}>{field(f.label+' · Student A',f.a??'[gap]',v=>change(d=>{const x=d.stages[si]!.items[ii]!;if(x.kind==='information_gap')x.facts[fi]!.a=v;}),f.a===null)}{field(f.label+' · Student B',f.b??'[gap]',v=>change(d=>{const x=d.stages[si]!.items[ii]!;if(x.kind==='information_gap')x.facts[fi]!.b=v;}),f.b===null)}</div>)}{item.questions.map((q,qi)=><div key={q.id}>{field(q.asker+' question · '+q.id,q.prompt,v=>change(d=>{const x=d.stages[si]!.items[ii]!;if(x.kind==='information_gap')x.questions[qi]!.prompt=v;}))}</div>)}</>}
      </div>)}
    </details>)}
    {field('Private teacher notes',doc.teacherNotes,v=>change(d=>{d.teacherNotes=v;}),false,true)}
  </div>;
}
