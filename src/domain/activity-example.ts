import type { ActivityDocument } from './activities';
export function exampleActivity(): ActivityDocument {
  const forms: {form:string;evidence:string}[]=[];
  const key=(itemId:string)=>({itemId,accepted:[] as string[],parts:[] as {id:string;accepted:string[]}[],order:[] as string[],rubric:''});
  return {
    schemaVersion:1,metadata:{title:'A day in the city',language:'en',level:'B1',skill:'Grammar and speaking',grammarPoint:'Present simple',category:'Everyday life'},
    objective:'Exchange everyday information and practise accurate sentence forms.',requiredForms:['present simple'],targetItemCount:8,
    stages:[{id:'notice',title:'Notice and practise',objective:'Recognise and use sentence forms.',instructions:'Complete each task in order.',dependsOn:[],items:[
      {id:'choose',kind:'multiple_choice',prompt:'She ___ to work every day.',forms:[{form:'present simple',evidence:'She'}],options:[{id:'a',text:'goes'},{id:'b',text:'go'}]},
      {id:'blank',kind:'fill_blank',prompt:'They {{verb}} near the station.',forms,blanks:['verb']},
      {id:'match',kind:'matching',prompt:'Match each place to its purpose.',forms,left:[{id:'library',text:'Library'},{id:'bakery',text:'Bakery'}],right:[{id:'books',text:'Borrow books'},{id:'bread',text:'Buy bread'}]},
      {id:'order',kind:'ordering',prompt:'Put the sentence in order.',forms,tokens:[{id:'who',text:'We'},{id:'verb',text:'walk'},{id:'place',text:'home.'}]},
      {id:'sort',kind:'categorization',prompt:'Sort the words.',forms,entries:[{id:'walk',text:'walk'},{id:'station',text:'station'}],categories:[{id:'verb',text:'Verb'},{id:'noun',text:'Noun'}]},
      {id:'change',kind:'transformation',prompt:'Make the sentence negative.',forms,operation:'affirmative_to_negative_present_simple',source:'She works here.'},
      {id:'write',kind:'open_response',prompt:'Describe your journey to work or school.',forms},
    ]},{id:'exchange',title:'Exchange information',objective:'Ask and answer to complete complementary information.',instructions:'You are Student A. Ferson is Student B.',dependsOn:['notice'],items:[
      {id:'gap',kind:'information_gap',prompt:'Complete the opening times and locations together.',forms,
        facts:[{id:'time',label:'Opening time',a:null,b:'9 a.m.'},{id:'place',label:'Location',a:'Station Road',b:null}],
        questions:[{id:'ask_time',asker:'A',factId:'time',prompt:'What time does it open?',dependsOn:[]},{id:'ask_place',asker:'B',factId:'place',prompt:'Where is it?',dependsOn:['ask_time']}]},
    ]}],
    answerKey:[
      {...key('choose'),accepted:['a']},
      {...key('blank'),parts:[{id:'verb',accepted:['live','work']}]},
      {...key('match'),parts:[{id:'library',accepted:['books']},{id:'bakery',accepted:['bread']}]},
      {...key('order'),order:['who','verb','place']},
      {...key('sort'),parts:[{id:'walk',accepted:['verb']},{id:'station',accepted:['noun']}]},
      {...key('change'),accepted:['She does not work here.',"She doesn't work here."]},
      {...key('write'),rubric:'Review meaning, present-simple accuracy, and completeness.'},
      {...key('gap'),rubric:'Both partners ask for missing information and answer their partner clearly.'},
    ],teacherNotes:'Example only. Replace with your source material and review every answer before approval.',
  };
}
