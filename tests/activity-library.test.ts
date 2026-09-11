import { describe,it,expect } from 'vitest';
import { activitySchema,blueprintFor,validateActivity,studentDocument,gradeItem,studentBTurn } from '../src/domain/activities';
import { exampleActivity } from '../src/domain/activity-example';
import { checkSource } from '../supabase/functions/_shared/activity-files';
describe('Activity Library teaching contract',()=>{
  it('renders a schema-valid example containing all eight task types',()=>{
    const doc=exampleActivity();expect(activitySchema.safeParse(doc).success).toBe(true);
    expect(new Set(doc.stages.flatMap(s=>s.items).map(i=>i.kind)).size).toBe(8);
    expect(validateActivity(doc).errors).toEqual([]);
  });
  it('allows surface changes while locking structural and pedagogical fields',()=>{
    const doc=exampleActivity(),locked=JSON.parse(JSON.stringify(blueprintFor(doc)));
    const reordered=Object.fromEntries(Object.entries(locked).reverse());
    doc.metadata.title='A day in another town';doc.stages[0]!.items[0]!.prompt='She ___ to school every day.';
    expect(validateActivity(doc,reordered).errors).toEqual([]);
    doc.stages.reverse();expect(validateActivity(doc,locked).errors.some(e=>e.code==='LOCKED_BLUEPRINT')).toBe(true);
  });
  it.each(['objective','requiredForms','targetItemCount'] as const)('locks %s',(field)=>{
    const doc=exampleActivity(),locked=blueprintFor(doc);
    if(field==='objective')doc.objective='A different objective';
    if(field==='requiredForms')doc.requiredForms.push('past perfect');
    if(field==='targetItemCount')doc.targetItemCount++;
    expect(validateActivity(doc,locked).errors.some(e=>e.code==='LOCKED_BLUEPRINT')).toBe(true);
  });
  it('rejects duplicate/missing IDs, option keys, blanks, matches, categories and ordering',()=>{
    const mutations:((doc:ReturnType<typeof exampleActivity>)=>void)[]=[
      d=>{d.stages[0]!.items[1]!.id='choose';},
      d=>{d.answerKey.pop();},
      d=>{d.answerKey[0]!.accepted=['not_an_option'];},
      d=>{d.stages[0]!.items[1]!.prompt='There is no blank here.';},
      d=>{d.answerKey[2]!.parts[1]!.accepted=['books'];},
      d=>{d.answerKey[3]!.order=['who','who','place'];},
      d=>{d.answerKey[4]!.parts[0]!.accepted=['unknown'];},
    ];
    for(const mutate of mutations){const d=exampleActivity();mutate(d);expect(validateActivity(d).errors.length).toBeGreaterThan(0);}
  });
  it('requires complementary gaps and valid question/stage dependencies',()=>{
    const d=exampleActivity(),gap=d.stages[1]!.items[0]!;
    if(gap.kind!=='information_gap')throw Error('fixture');
    gap.facts[0]!.a='9 a.m.';
    gap.questions[0]!.dependsOn=['ask_place'];
    d.stages[0]!.dependsOn=['exchange'];
    const codes=validateActivity(d).errors.map(e=>e.code);
    expect(codes).toContain('COMPLEMENTARY_GAP');expect(codes).toContain('QUESTION_DEPENDENCY');expect(codes).toContain('STAGE_DEPENDENCY');
  });
  it('requires verifiable form evidence and explicit manual review',()=>{
    const d=exampleActivity();d.stages[0]!.items[0]!.forms[0]!.evidence='not present anywhere';
    expect(validateActivity(d).errors.map(e=>e.code)).toContain('FORM_EVIDENCE');
    expect(validateActivity(exampleActivity()).warnings.map(w=>w.code)).toContain('HUMAN_REVIEW');
  });
  it('never exposes keys, teacher notes, form-answer evidence, or Student B facts in learner projection',()=>{
    const d=exampleActivity(),safe=studentDocument(d);
    const serialized=JSON.stringify(safe);
    for(const privateValue of ['answerKey','teacherNotes','rubric','evidence','9 a.m.'])expect(serialized).not.toContain(privateValue);
    expect(serialized).toContain('Station Road');
    const gap=safe.stages[1]!.items[0]!;
    if(gap.kind!=='information_gap')throw Error('fixture');
    expect(gap.questions.every(q=>q.asker==='A')).toBe(true);
  });
  it('grades supported tasks without returning answer keys and keeps open response manual',()=>{
    const d=exampleActivity();
    expect(gradeItem(d,'choose','a')).toEqual({correct:true});
    expect(gradeItem(d,'choose','b')).toEqual({correct:false});
    expect(gradeItem(d,'blank',{verb:' LIVE '})).toEqual({correct:true});
    expect(gradeItem(d,'match',{library:'books',bakery:'bread'})).toEqual({correct:true});
    expect(gradeItem(d,'order',['who','verb','place'])).toEqual({correct:true});
    expect(gradeItem(d,'sort',{walk:'verb',station:'noun'})).toEqual({correct:true});
    expect(gradeItem(d,'change','She does not work here.')).toEqual({correct:true});
    expect(gradeItem(d,'write','Anything')).toEqual({correct:null,review:'human_review_required'});
    expect(studentBTurn(d,'gap','ask_time')).toEqual({speaker:'Ferson',text:'9 a.m.'});
    expect(studentBTurn(d,'gap','ask_place')).toEqual({speaker:'Ferson',text:'Where is it?'});
  });
  it('checks source types, size, and signature without trusting browser MIME',()=>{
    expect(checkSource('lesson.pdf',new TextEncoder().encode('%PDF-1.7\n'))).toBe('application/pdf');
    expect(()=>checkSource('lesson.pdf',new TextEncoder().encode('<script>'))).toThrow('INVALID_FILE_SIGNATURE');
    expect(()=>checkSource('lesson.html',new TextEncoder().encode('hello'))).toThrow('INVALID_SOURCE');
    expect(()=>checkSource('lesson.txt',new Uint8Array(10485761))).toThrow('INVALID_SOURCE');
  });
});
