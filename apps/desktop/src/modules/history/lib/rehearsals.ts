import sampleTalk from "@/assets/sample-talk.m4a";

// ponytail: mock threads until attempts are saved locally (PLAN §2.5, §7.2).
// Every number here stands in for what the analysis code will compute.

export const SUBSCORES = [
  "Fluency",
  "Variety",
  "Pace",
  "Delivery",
  "Grammar",
  "Vocabulary",
  "Flow",
] as const;

export type Subscore = (typeof SUBSCORES)[number];

export type KeyPointDepth = "good" | "brief" | "missed";

export type Attempt = {
  // The better version of the talk, as transcript markup.
  better: string;
  date: string;
  keyPoints: { depth: KeyPointDepth; point: string }[];
  n: number;
  score: number;
  // How long the student actually spoke.
  spokenSeconds: number;
  // The attempt's audio file (a local path once recording exists).
  recording: string;
  subscores: { name: Subscore; value: number }[];
  // What the student said, as transcript markup.
  transcript: string;
  wpm: number;
};

export type Rehearsal = {
  attempts: Attempt[];
  id: string;
  latest: Attempt;
  minutes: number;
  topic: string;
};

// Subscores sit around the overall score, each with its own lean.
const SUBSCORE_LEAN = [-6, 4, 2, -3, 5, -1, 3];

const DEPTH_BY_LETTER: Record<string, KeyPointDepth> = {
  b: "brief",
  g: "good",
  m: "missed",
};

type Run = Pick<Attempt, "date" | "score" | "transcript" | "wpm"> & {
  // m:ss, as written in the mock data below.
  spoken: string;
  // One letter per key point: g(ood), b(rief), m(issed).
  depths: string;
};

function rehearsal(
  id: string,
  topic: string,
  minutes: number,
  points: string[],
  better: string,
  runs: Run[]
): Rehearsal {
  const [first, ...rest] = runs.map((run, index): Attempt => ({
    better,
    date: run.date,
    keyPoints: points.map((point, pointIndex) => ({
      depth: DEPTH_BY_LETTER[run.depths.charAt(pointIndex)] ?? "missed",
      point,
    })),
    n: index + 1,
    // ponytail: one dummy recording (macOS `say`) for every attempt; delete
    // src/assets/sample-talk.m4a once real recordings are saved.
    recording: sampleTalk,
    score: run.score,
    spokenSeconds: run.spoken
      .split(":")
      .reduce((total, part) => total * 60 + Number(part), 0),
    subscores: SUBSCORES.map((name, nameIndex) => ({
      name,
      value: Math.min(
        100,
        Math.max(
          0,
          run.score +
            SUBSCORE_LEAN[nameIndex] +
            (((index + 1) * (nameIndex + 2)) % 5)
        )
      ),
    })),
    transcript: run.transcript,
    wpm: run.wpm,
  }));

  if (first === undefined) {
    throw new Error(`Rehearsal "${id}" has no attempts.`);
  }

  return {
    attempts: [first, ...rest],
    id,
    latest: rest.at(-1) ?? first,
    minutes,
    topic,
  };
}

// Transcript markup: <f:um> filler · <r:and then> repeated phrase ·
// <g:said|fix|why> grammar · <v:said|better|why> vocabulary · <p:2.4> long
// pause (seconds) · <s:why> suggested pause · <c:text> changed in the better
// version. A blank line starts a new paragraph.
export const REHEARSAL_GROUPS: { label: string; rehearsals: Rehearsal[] }[] = [
  {
    label: "Today",
    rehearsals: [
      rehearsal(
        "conditionals",
        "Conditional statements in C++",
        7,
        [
          "What a condition is",
          "if / else syntax",
          "else if chains",
          "Nested conditions",
          "switch vs if-else",
          "Common mistakes",
        ],
        `Today I'll explain conditional statements in C++. A condition is an expression that is either true or false, and the program uses it to decide which code runs. <p:0.5> <c:The if statement checks the condition: if it's true, the block inside the braces runs; otherwise, the else block runs.>

<p:1> <c:When there are more than two cases,> we chain else if. Take a grade: above ninety is an A, above eighty is a B, and so on. Nested conditions put one if inside another, which <c:helps> when a second check only matters after the first one passes. <p:0.5> <c:Finally,> a switch statement compares one value against fixed cases. It's <c:cleaner> than a long else-if chain, but each case <c:needs> a break<c:, or execution falls through to the next case.>`,
        [
          {
            date: "Oct 9, 6:12 PM",
            depths: "gbmmmm",
            score: 62,
            spoken: "4:51",
            transcript: `So <f:um> today I'm going to talk about conditional statements in C++. <f:Basically> a condition is <g:a expression|an expression|Use “an” before a vowel sound.> that is true or false, <r:and then> the program <g:decide|decides|With “the program”, the verb takes -s.> what to do. <p:3.2> <f:Uh> so the if statement checks the condition, <r:and then> if it is true it runs the code inside the braces.

<r:And then> we have else. Else <g:run|runs|With a singular subject, the verb takes -s.> when the condition is false. <f:Like>, it's <v:very good|really useful|“Very good” is vague. Say why it helps.> when you have two choices. <s:Pause before you move to a new idea so the listener can follow.> <f:Um> <r:and then> there is else if, which is <v:a lot of ifs|a chain of conditions|Name the idea precisely.>, <f:you know>, for more than two options. <p:4.8> I think that's <f:basically> it.`,
            wpm: 118,
          },
          {
            date: "Yesterday, 9:40 PM",
            depths: "ggbbmm",
            score: 71,
            spoken: "6:02",
            transcript: `Today I'll explain conditional statements in C++. A condition is an expression that is either true or false, <f:um> and the program <g:use|uses|With a singular subject, the verb takes -s.> it to decide what to run. <s:Pause before the key idea so it lands.> The if statement checks the condition, <r:and then> if it's true, the code in the braces runs.

<r:And then> else runs when the condition is false. For more than two cases we use else if, <f:like> checking a grade: if the score is above ninety it's an A, else if it's above eighty it's a B. <p:3.1> <r:And then> nested conditions are <v:ifs inside ifs|conditions inside other conditions|Use the term you are explaining.>, <f:basically>. I didn't get to switch statements this time.`,
            wpm: 131,
          },
          {
            date: "Today, 10:24 AM",
            depths: "gggbbm",
            score: 78,
            spoken: "6:48",
            transcript: `Today I'll explain conditional statements in C++. A condition is an expression that is either true or false, and the program uses it to decide which code runs. The if statement checks the condition; if it's true, the block inside the braces runs. Otherwise, the else block runs.

For more than two cases, we chain else if. Take a grade: above ninety is an A, above eighty is a B, and so on. <s:Pause before the comparison so it stands out.> Nested conditions put one if inside another, <f:um> which is useful when a second check only matters after the first passes. <p:2.1> Finally, a switch statement compares one value against fixed cases. It's <v:more clean|cleaner|Short adjectives take -er instead of “more”.> than a long else-if chain, but each case <g:need|needs|With a singular subject, the verb takes -s.> a break.`,
            wpm: 142,
          },
        ]
      ),
      rehearsal(
        "loops",
        "Loops: for vs while",
        4,
        [
          "What a loop is",
          "for loop parts",
          "while loop",
          "Choosing between them",
          "Infinite loops",
        ],
        `A loop repeats a block of code. A for loop has three parts: <c:initialisation>, condition, and <c:update>, <c:so it suits cases where you know the number of repetitions.> <p:0.5> A while loop checks its condition first and <c:keeps running as long as it is true.> <p:0.5> If the condition never becomes false, the loop <c:never stops: an infinite loop.>`,
        [
          {
            date: "Today, 9:05 AM",
            depths: "ggbmm",
            score: 64,
            spoken: "3:12",
            transcript: `<f:So> a loop repeats code. <f:Um> a for loop has three parts: start, condition and <g:increase|update|The third part can also count down, so “update” is the right term.>. <r:You use it when> you know how many times. <p:3.6> <f:Uh> a while loop <g:check|checks|With a singular subject, the verb takes -s.> the condition first. <r:You use it when> you don't know the count. <s:Pause before the warning so it stands out.> If the condition never becomes false, it <v:goes forever|never stops|Say exactly what happens: it becomes an infinite loop.>.`,
            wpm: 126,
          },
        ]
      ),
    ],
  },
  {
    label: "Yesterday",
    rehearsals: [
      rehearsal(
        "classes",
        "Classes and objects",
        7,
        [
          "Class as a blueprint",
          "Objects and instances",
          "Members and methods",
          "Constructors",
          "Access modifiers",
          "A real example",
        ],
        `A class is a blueprint: it describes the data and behaviour an object has. An object is an instance of that class, and each object keeps its own copy of the members. <p:0.5> <c:Methods define what an object can do,> constructors set it up when it is created, and access modifiers like private hide data from outside code. <p:1> <c:Take a Car class: it has a speed member and a drive method.>`,
        [
          {
            date: "Oct 8, 4:30 PM",
            depths: "ggbmmm",
            score: 66,
            spoken: "5:40",
            transcript: `A class is <f:like> a blueprint. <r:The thing is>, it describes what an object <g:have|has|With a singular subject, the verb takes -s.>. <f:Um> an object is <g:a instance|an instance|Use “an” before a vowel sound.> of the class. <p:3.9> <r:The thing is>, each object has its own data, <f:basically> the members, and methods are <v:things it can do|its behaviour|Use the precise term.>. <s:Pause before you introduce a new idea.> Constructors, <f:uh>, set up the object when it's created.`,
            wpm: 124,
          },
          {
            date: "Yesterday, 7:15 PM",
            depths: "gggbmm",
            score: 71,
            spoken: "6:35",
            transcript: `A class is a blueprint: it describes the data and behaviour an object has. An object is an instance of that class. <s:Pause before the example so it lands.> Each object keeps its own copy of the members, <f:um> and methods define what it can do. <p:2.8> Constructors set up a new object, and access modifiers like private <g:hides|hide|“Modifiers” is plural, so the verb takes no -s.> data from outside code. <r:For example>, a Car class, <r:for example>, has speed and a drive method.`,
            wpm: 136,
          },
        ]
      ),
      rehearsal(
        "hometown",
        "My hometown",
        1,
        ["Where it is", "What it’s known for", "A personal memory"],
        `I'm from Multan, a city in the south of Punjab, <c:famous for its mangoes and its centuries-old shrines.> <p:1> <c:What I remember most is> the summer heat and buying mangoes with my father every June. It's a <c:warm, welcoming> place.`,
        [
          {
            date: "Yesterday, 11:02 AM",
            depths: "gbm",
            score: 69,
            spoken: "0:58",
            transcript: `I'm from Multan, a city in the south of Punjab. <f:Um> it's known for mangoes and <g:it's old shrines|its old shrines|“Its” shows possession; “it's” means “it is”.>. <p:2.2> <r:I remember> the summer heat, and <r:I remember> buying mangoes with my father every June. <s:Pause before your memory so it lands.> It's a <v:very nice|warm, welcoming|Describe the feeling precisely.> place.`,
            wpm: 139,
          },
        ]
      ),
    ],
  },
  {
    label: "Previous 7 days",
    rehearsals: [
      rehearsal(
        "stack",
        "How a stack works",
        4,
        [
          "Last in, first out",
          "Push and pop",
          "Peek and isEmpty",
          "Where stacks are used",
          "Stack overflow",
        ],
        `A stack works on last in, first out. You push to add an item on top <c:and pop to remove it;> peek shows the top item without removing it, and isEmpty checks whether anything is left. <p:0.5> <c:Browsers use a stack for the back button, and every function call your program makes sits on the call stack.> <p:0.5> If you push too much, you get <c:a stack overflow.>`,
        [
          {
            date: "Oct 5, 8:20 PM",
            depths: "gbmmm",
            score: 52,
            spoken: "3:05",
            transcript: `<f:Um> a stack is last in, first out. <f:So> <f:basically> you push to put something on top, <r:and then> pop to take it off. <p:5.2> <f:Uh> peek <g:show|shows|With a singular subject, the verb takes -s.> the top without removing it. <r:And then> isEmpty, <f:like>, checks if it's empty. <v:It's used a lot|Browsers and compilers use it|Give a concrete example instead of a vague claim.>.`,
            wpm: 112,
          },
          {
            date: "Oct 6, 8:45 PM",
            depths: "ggbmm",
            score: 58,
            spoken: "3:40",
            transcript: `A stack works on last in, first out. You push to add an item on top, <r:and then> pop to remove it. Peek shows the top item without removing it, <f:um> and isEmpty checks whether the stack has anything left. <p:4.0> <r:And then> browsers use a stack for the back button. <s:Pause before the warning so it stands out.> If you push too much, you get <g:a overflow|an overflow|Use “an” before a vowel sound.>.`,
            wpm: 121,
          },
        ]
      ),
      rehearsal(
        "attendance",
        "Should attendance be mandatory?",
        4,
        [
          "Your position",
          "Strongest argument for",
          "Strongest argument against",
          "A compromise",
          "Conclusion",
        ],
        `I think attendance <c:shouldn't be mandatory.> Students are adults and know their own needs. <p:1> On the other hand, <c:many> students fall behind when they skip, and <c:group work depends on everyone being there.> <p:0.5> A good middle ground is requiring attendance only for labs <c:and assessments.>`,
        [
          {
            date: "Oct 6, 1:10 PM",
            depths: "ggbbm",
            score: 66,
            spoken: "3:52",
            transcript: `I think attendance <v:shouldn't be forced|shouldn't be mandatory|Use the words from the question.>. <f:Um> students are adults and <g:they knows|they know|“They” takes the base form: know.> their own needs. <p:2.9> On the other hand, <r:a lot of> students fall behind when they skip, and <r:a lot of> teachers plan group work. <s:Pause before your compromise.> A good middle ground is, <f:like>, requiring attendance only for labs.`,
            wpm: 147,
          },
        ]
      ),
      rehearsal(
        "variables",
        "Variables and data types",
        1,
        ["What a variable is", "Common data types", "Choosing the right type"],
        `A variable is a named place in memory that stores a value. Common types are int for whole numbers, double for decimals, and char for a single character. <p:0.5> You choose the type based on the data you store, so the compiler knows how much memory to <c:reserve and which operations are allowed.>`,
        [
          {
            date: "Oct 5, 10:00 AM",
            depths: "gmm",
            score: 55,
            spoken: "0:51",
            transcript: `A variable, <f:um>, stores a value. <f:Uh>, like int for numbers, <r:and then> double for decimals, <r:and then> char for <g:a letter|one character|A char holds any single character, not only letters.>. <p:3.3> You <v:pick the type|choose the type|“Choose” sounds more precise in a talk.> based on the data.`,
            wpm: 117,
          },
          {
            date: "Oct 5, 10:12 AM",
            depths: "gbm",
            score: 61,
            spoken: "1:00",
            transcript: `A variable is a named place in memory that stores a value. Common types are int for whole numbers, double for decimals, and char for a single character. <p:2.4> You choose the type based on <g:the data you stores|the data you store|“You” takes the base form: store.>, <f:um>, so the compiler knows how much memory to use.`,
            wpm: 128,
          },
        ]
      ),
    ],
  },
  {
    label: "Earlier",
    rehearsals: [
      rehearsal(
        "inheritance",
        "Inheritance",
        4,
        [
          "Base and derived classes",
          "What gets inherited",
          "Overriding methods",
          "Is-a relationships",
          "When not to inherit",
        ],
        `Inheritance <c:lets one class reuse and extend another.> The base class <c:acts as the parent> and the derived class <c:as the child>, and the child can override methods to change how they work. <p:0.5> Use it for is-a relationships, <c:not just to reuse code.>`,
        [
          {
            date: "Sep 28, 5:00 PM",
            depths: "gbbmm",
            score: 55,
            spoken: "3:31",
            transcript: `Inheritance is when a class <g:take|takes|With a singular subject, the verb takes -s.> things from another class. <f:Um> the base class <r:is like> the parent and the derived class <r:is like> the child. <p:4.4> <f:Basically> the child can override methods, <f:uh>, to change how they work. <s:Pause before the rule.> You should use it for is-a relationships, <v:not always|not just to reuse code|Say exactly when to avoid it.>.`,
            wpm: 119,
          },
        ]
      ),
      rehearsal(
        "teacher",
        "A teacher who influenced me",
        1,
        ["Who they were", "What they did", "How it changed you"],
        `My maths teacher in grade eight, Mr. Saleem, always explained things with real examples. <p:1> <c:He's the reason I enjoy problem solving, and the reason I chose computer science.>`,
        [
          {
            date: "Sep 26, 3:15 PM",
            depths: "gmm",
            score: 52,
            spoken: "0:47",
            transcript: `My teacher, <f:um>, Mr. Saleem taught me maths in grade eight. <f:Uh> he <g:always explain|always explained|The story is in the past, so use the past tense.> things with real examples. <p:3.8> <r:Because of him> I like problem solving, <r:because of him> I chose computer science.`,
            wpm: 109,
          },
        ]
      ),
      rehearsal(
        "arrays-lists",
        "Arrays vs linked lists",
        7,
        [
          "Memory layout",
          "Access by index",
          "Insertion and deletion",
          "Cache friendliness",
          "When to use which",
          "A quick example",
        ],
        `Arrays and linked lists both store sequences. An array <c:sits> in one block of memory, so you can reach any element by index<c:, and it is friendly to the CPU cache.> <p:0.5> A linked list is made of nodes, <c:where> each node points to the next, <c:which makes inserting in the middle cheap.>`,
        [
          {
            date: "Sep 20, 7:40 PM",
            depths: "gbmmmm",
            score: 44,
            spoken: "4:10",
            transcript: `<f:So> arrays and linked lists, <f:um>, both store lists. <f:Basically> an array is <g:store|stored|After “is”, use the past participle: stored.> next to each other in memory. <r:And then> a linked list has nodes, <r:and then> each node points to the next. <p:6.1> <f:Uh> arrays are <v:fast|fast to access by index|Say what is fast.>, <f:like>, and lists are good for inserting.`,
            wpm: 104,
          },
          {
            date: "Sep 22, 7:55 PM",
            depths: "gbbmmm",
            score: 49,
            spoken: "5:20",
            transcript: `Arrays and linked lists both store sequences. An array is stored in one block of memory, so you can reach any element by index. <f:Um> a linked list is made of nodes, <r:and then> each node points to the next. <p:4.9> Inserting in the middle is <v:easier|cheaper|“Cheaper” says it takes fewer steps.> in a list, <r:and then> <g:a array|an array|Use “an” before a vowel sound.> is friendlier to the cache.`,
            wpm: 113,
          },
        ]
      ),
    ],
  },
];

export function getRehearsal(id: string) {
  return REHEARSAL_GROUPS.flatMap((group) => group.rehearsals).find(
    (item) => item.id === id
  );
}

export const STREAK_DAYS = 4;

// Whether the student rehearsed on each of the last 7 days, ending today.
export const PRACTICE_DAYS = [true, false, true, true, true, true, false];
