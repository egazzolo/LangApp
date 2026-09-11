import { z } from 'npm:zod@4.4.3';
const id = z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/);
const text = z.string().trim().min(1).max(6000);
const option = z.object({ id, text }).strict();
const base = { id, prompt: text, forms: z.array(z.object({ form: text, evidence: text }).strict()).max(30) };
export const itemSchema = z.discriminatedUnion('kind', [
  z.object({ ...base, kind: z.literal('multiple_choice'), options: z.array(option).min(2).max(20) }).strict(),
  z.object({ ...base, kind: z.literal('fill_blank'), blanks: z.array(id).min(1).max(30) }).strict(),
  z.object({ ...base, kind: z.literal('matching'), left: z.array(option).min(2).max(30), right: z.array(option).min(2).max(30) }).strict(),
  z.object({ ...base, kind: z.literal('ordering'), tokens: z.array(option).min(2).max(30) }).strict(),
  z.object({ ...base, kind: z.literal('categorization'), entries: z.array(option).min(1).max(30), categories: z.array(option).min(2).max(20) }).strict(),
  z.object({ ...base, kind: z.literal('transformation'), operation: text, source: text }).strict(),
  z.object({ ...base, kind: z.literal('open_response') }).strict(),
  z.object({ ...base, kind: z.literal('information_gap'),
    facts: z.array(z.object({ id, label: text, a: text.nullable(), b: text.nullable() }).strict()).min(2).max(40),
    questions: z.array(z.object({ id, asker: z.enum(['A','B']), factId: id, prompt: text, dependsOn: z.array(id).max(20) }).strict()).min(2).max(50),
  }).strict(),
]);
export const keySchema = z.object({
  itemId: id, accepted: z.array(text).max(30),
  parts: z.array(z.object({ id, accepted: z.array(text).min(1).max(20) }).strict()).max(50),
  order: z.array(id).max(30), rubric: z.string().max(6000),
}).strict();
export const activitySchema = z.object({
  schemaVersion: z.literal(1),
  metadata: z.object({ title: text, language: z.enum(['en','es']), level: z.enum(['A1','A2','B1','B2','C1','C2']), skill: text, grammarPoint: text, category: text }).strict(),
  objective: text, requiredForms: z.array(text).max(30), targetItemCount: z.number().int().min(1).max(200),
  stages: z.array(z.object({ id, title: text, objective: text, instructions: text, dependsOn: z.array(id).max(20), items: z.array(itemSchema).min(1).max(50) }).strict()).min(1).max(20),
  answerKey: z.array(keySchema).max(200), teacherNotes: z.string().max(12000),
}).strict();
export type ActivityDocument = z.infer<typeof activitySchema>;
export type ActivityItem = z.infer<typeof itemSchema>;
export type AnswerKey = z.infer<typeof keySchema>;
export type ValidationIssue = { code: string; path: string; message: string };
export type ValidationReport = { errors: ValidationIssue[]; warnings: ValidationIssue[] };
export const statuses = ['uploaded','converting','converted_draft','needs_review','approved','published','rejected','retired'] as const;
export type ActivityStatus = typeof statuses[number];
const norm = (s: string) => s.trim().toLocaleLowerCase().replace(/\s+/g,' ');
const sameSet = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');

export function canonical(value: unknown): string {
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value && typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical((value as Record<string,unknown>)[key])).join(',')+'}';
  return JSON.stringify(value);
}
export function blueprintFor(doc: ActivityDocument) {
  return structuredClone({
    language: doc.metadata.language, level: doc.metadata.level, skill: doc.metadata.skill, grammarPoint: doc.metadata.grammarPoint,
    objective: doc.objective, requiredForms: doc.requiredForms, targetItemCount: doc.targetItemCount,
    stages: doc.stages.map(stage => ({
      id: stage.id, objective: stage.objective, dependsOn: stage.dependsOn,
      items: stage.items.map(item => ({
        id: item.id, kind: item.kind, forms: item.forms.map(f => f.form),
        structure: item.kind === 'multiple_choice' ? item.options.map(o => o.id)
          : item.kind === 'fill_blank' ? item.blanks
          : item.kind === 'matching' ? [item.left.map(o => o.id),item.right.map(o => o.id)]
          : item.kind === 'ordering' ? item.tokens.map(o => o.id)
          : item.kind === 'categorization' ? [item.entries.map(o => o.id),item.categories.map(o => o.id)]
          : item.kind === 'transformation' ? item.operation
          : item.kind === 'information_gap' ? {
            facts: item.facts.map(f => ({ id:f.id,aGap:f.a===null,bGap:f.b===null })),
            questions: item.questions.map(q => ({ id:q.id,asker:q.asker,factId:q.factId,dependsOn:q.dependsOn })),
          } : null,
      })),
    })),
  });
}
export function validateActivity(input: unknown, lockedBlueprint?: unknown): ValidationReport {
  const errors: ValidationIssue[] = [], warnings: ValidationIssue[] = [];
  const fail = (code: string, path: string, message: string) => errors.push({code,path,message});
  const parsed = activitySchema.safeParse(input);
  if (!parsed.success) return { errors: parsed.error.issues.map(i => ({code:'SCHEMA',path:i.path.join('.'),message:i.message})), warnings };
  const doc = parsed.data;
  const unique = (values: string[], path: string) => { if (new Set(values).size !== values.length) fail('DUPLICATE_ID',path,'IDs must be unique.'); };
  const options = (items: {id:string;text:string}[], path: string) => {
    unique(items.map(o=>o.id),path);
    if (new Set(items.map(o=>norm(o.text))).size !== items.length) fail('AMBIGUOUS_LABEL',path,'Duplicate labels make the task ambiguous.');
  };
  const all = doc.stages.flatMap(s=>s.items);
  unique(doc.stages.map(s=>s.id),'stages'); unique(all.map(i=>i.id),'items');
  unique(doc.answerKey.map(k=>k.itemId),'answerKey');
  unique(doc.requiredForms.map(norm),'requiredForms');
  if (all.length !== doc.targetItemCount) fail('TARGET_COUNT','targetItemCount','Target-item count must match the number of items.');
  if (!sameSet(all.map(i=>i.id),doc.answerKey.map(k=>k.itemId))) fail('KEY_COVERAGE','answerKey','Every item needs exactly one answer-key entry; no extra keys.');
  const priorStages = new Set<string>();
  for (const stage of doc.stages) {
    unique(stage.dependsOn,stage.id);
    for(const dependency of stage.dependsOn) if(!priorStages.has(dependency)) fail('STAGE_DEPENDENCY',stage.id,'Dependencies must refer to earlier stages.');
    priorStages.add(stage.id);
    for(const item of stage.items) {
      const key = doc.answerKey.find(k=>k.itemId===item.id);
      if(!key)continue;
      unique(key.parts.map(p=>p.id),item.id+'.key.parts');
      const expectedParts = item.kind==='fill_blank' ? item.blanks : item.kind==='matching' ? item.left.map(x=>x.id) : item.kind==='categorization' ? item.entries.map(x=>x.id) : [];
      if(!sameSet(expectedParts,key.parts.map(p=>p.id))) fail('KEY_PARTS',item.id,'Answer parts must match all task parts exactly.');
      if(item.kind!=='ordering' && key.order.length) fail('UNUSED_ORDER',item.id,'Only ordering tasks can have an order key.');
      if(!['multiple_choice','transformation'].includes(item.kind) && key.accepted.length) fail('UNUSED_ANSWER',item.id,'Unexpected accepted answers for this task type.');
      if(item.kind==='multiple_choice') {
        options(item.options,item.id);
        if(key.accepted.length!==1 || !item.options.some(o=>o.id===key.accepted[0])) fail('OPTION_KEY',item.id,'Choose exactly one valid option ID.');
      }
      if(item.kind==='fill_blank') {
        unique(item.blanks,item.id);
        const tokens=[...item.prompt.matchAll(/\{\{([a-z][a-z0-9_-]*)\}\}/g)].map(m=>m[1]!);
        if(!sameSet(tokens,item.blanks)) fail('BLANK_MARKERS',item.id,'Each blank ID must appear exactly once as {{id}} in the prompt.');
      }
      if(item.kind==='matching') {
        options(item.left,item.id+'.left'); options(item.right,item.id+'.right');
        if(item.left.length!==item.right.length)fail('MATCH_SIZE',item.id,'Matching must be a one-to-one complete match.');
        const targets=key.parts.flatMap(p=>p.accepted);
        if(key.parts.some(p=>p.accepted.length!==1) || !sameSet(targets,item.right.map(o=>o.id)))fail('MATCH_KEY',item.id,'Every right option must match exactly one left option.');
      }
      if(item.kind==='ordering') {
        options(item.tokens,item.id);
        if(!sameSet(key.order,item.tokens.map(o=>o.id)))fail('ORDER_KEY',item.id,'Order must contain every token ID exactly once.');
      }
      if(item.kind==='categorization') {
        options(item.entries,item.id+'.entries'); options(item.categories,item.id+'.categories');
        if(key.parts.some(p=>p.accepted.length!==1 || !item.categories.some(c=>c.id===p.accepted[0]))) fail('CATEGORY_KEY',item.id,'Each entry must map to exactly one category ID.');
      }
      if(item.kind==='transformation' && !key.accepted.length)fail('TRANSFORMATION_KEY',item.id,'Provide at least one accepted transformed sentence.');
      if(['open_response','information_gap'].includes(item.kind) && !key.rubric.trim())fail('RUBRIC',item.id,'Provide a human-review rubric.');
      for(const part of key.parts) if(new Set(part.accepted.map(norm)).size!==part.accepted.length)fail('DUPLICATE_ANSWER',item.id,'Accepted alternatives must be distinct.');
      if(item.kind==='information_gap') {
        unique(item.facts.map(f=>f.id),item.id+'.facts'); unique(item.questions.map(q=>q.id),item.id+'.questions');
        if(!item.facts.some(f=>f.a===null) || !item.facts.some(f=>f.b===null))fail('GAP_BALANCE',item.id,'Both partners must have missing information.');
        for(const fact of item.facts) {
          if((fact.a===null)===(fact.b===null))fail('COMPLEMENTARY_GAP',item.id+'.'+fact.id,'Exactly one partner must know each fact.');
          const asker=fact.a===null?'A':'B';
          if(!item.questions.some(q=>q.factId===fact.id&&q.asker===asker))fail('GAP_QUESTION',item.id+'.'+fact.id,'Every gap needs a question from the partner missing that fact.');
        }
        const prior=new Set<string>();
        for(const q of item.questions) {
          const fact=item.facts.find(f=>f.id===q.factId);
          if(!fact || (q.asker==='A'?fact.a!==null:fact.b!==null))fail('QUESTION_FACT',item.id+'.'+q.id,'Questions must target information missing from that partner.');
          if(q.dependsOn.some(d=>!prior.has(d)))fail('QUESTION_DEPENDENCY',item.id+'.'+q.id,'Question dependencies must reference earlier questions in this item.');
          prior.add(q.id);
        }
      }
      const evidenceText = norm([item.prompt, ...key.accepted, ...key.parts.flatMap(p=>p.accepted), item.kind==='transformation'?item.source:''].join(' '));
      for(const form of item.forms) {
        if(!doc.requiredForms.includes(form.form))fail('UNKNOWN_FORM',item.id,'Form tags must belong to requiredForms.');
        if(!evidenceText.includes(norm(form.evidence)))fail('FORM_EVIDENCE',item.id,'Required-form evidence must occur in the prompt, source, or answer.');
      }
    }
  }
  for(const form of doc.requiredForms)if(!all.some(i=>i.forms.some(f=>f.form===form)))fail('FORM_COVERAGE','requiredForms','Each required form needs item-level evidence.');
  if(lockedBlueprint && canonical(blueprintFor(doc))!==canonical(lockedBlueprint))fail('LOCKED_BLUEPRINT','blueprint','The draft changes locked teaching structure. Create a separate activity for a different blueprint.');
  warnings.push({code:'HUMAN_REVIEW',path:'activity',message:'Compare with the original: confirm meaning, level, all acceptable answers, form accuracy, and teaching sequence. Mechanical checks cannot prove pedagogical quality.'});
  return {errors,warnings};
}

export function studentDocument(doc: ActivityDocument) {
  return { schemaVersion:doc.schemaVersion,metadata:doc.metadata,objective:doc.objective,
    stages:doc.stages.map(s=>({id:s.id,title:s.title,instructions:s.instructions,dependsOn:s.dependsOn,
      items:s.items.map(item=>{
        const {forms,...safe}=item;
        if(safe.kind!=='information_gap')return safe;
        return {...safe,facts:safe.facts.map(({b,...fact})=>fact),questions:safe.questions.filter(q=>q.asker==='A').map(q=>({...q,dependsOn:q.dependsOn.filter(dep=>safe.questions.some(x=>x.id===dep&&x.asker==='A'))}))};
      })})),
  };
}
export function gradeItem(doc: ActivityDocument, itemId: string, answer: unknown) {
  const item=doc.stages.flatMap(s=>s.items).find(i=>i.id===itemId),key=doc.answerKey.find(k=>k.itemId===itemId);
  if(!item||!key)throw new Error('ITEM_NOT_FOUND');
  if(item.kind==='open_response'||item.kind==='information_gap')return {correct:null,review:'human_review_required'};
  if(item.kind==='multiple_choice'||item.kind==='transformation')return {correct:typeof answer==='string'&&key.accepted.some(a=>norm(a)===norm(answer))};
  if(item.kind==='ordering')return {correct:Array.isArray(answer)&&answer.length===key.order.length&&answer.every((a,i)=>a===key.order[i])};
  const parts=answer&&typeof answer==='object'&&!Array.isArray(answer)?answer as Record<string,unknown>:{};
  return {correct:Object.keys(parts).length===key.parts.length&&key.parts.every(p=>typeof parts[p.id]==='string'&&p.accepted.some(a=>norm(a)===norm(parts[p.id] as string)))};
}
export function studentBTurn(doc: ActivityDocument,itemId:string,questionId:string) {
  const item=doc.stages.flatMap(s=>s.items).find(i=>i.id===itemId);
  if(item?.kind!=='information_gap')throw new Error('ITEM_NOT_FOUND');
  const question=item.questions.find(q=>q.id===questionId);
  if(!question)throw new Error('QUESTION_NOT_FOUND');
  const fact=item.facts.find(f=>f.id===question.factId)!;
  return question.asker==='A' ? {speaker:'Ferson',text:fact.b} : {speaker:'Ferson',text:question.prompt};
}
