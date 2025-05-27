// Diagram types and themes for Inztagram

export interface DiagramTheme {
  value: string;
  label: string;
}

export const DIAGRAM_THEMES: DiagramTheme[] = [
  { value: 'default', label: 'Default' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'dark', label: 'Dark' },
  { value: 'forest', label: 'Forest' },
  { value: 'base', label: 'Base' },
];

export interface DiagramType {
  value: string;
  label: string;
  example: string;
  image: string;
}



export const DIAGRAM_TYPES: DiagramType[] = [
  {
    value: 'graph TD',
    label: 'Flowchart (Top-Down)',
    example: `
    graph TD;
        A-->B;
        A-->C;
        B-->D;
        C-->D;
    `,
    image: 'https://mermaid.ink/img/graph-TD'
  },
  {
    value: 'graph LR',
    label: 'Flowchart (Left-Right)',
    example: `
    graph LR;
        A-->B;
        A-->C;
        B-->D;
        C-->D;
    `,
    image: 'https://mermaid.ink/img/graph-LR'
  },
  {
    value: 'sequenceDiagram',
    label: 'Sequence Diagram',
    example: `
    sequenceDiagram
      Alice->>John: Hello John, how are you?
      John-->>Alice: Great!
      Alice-)John: See you later!
    `,
    image: 'https://mermaid.ink/img/sequenceDiagram'
  },
  {
    value: 'classDiagram',
    label: 'Class Diagram',
    example: `
    classDiagram
        note "From Duck till Zebra"
        Animal <|-- Duck
        note for Duck "can fly\ncan swim\ncan dive\ncan help in debugging"
        Animal <|-- Fish
        Animal <|-- Zebra
        Animal : +int age
        Animal : +String gender
        Animal: +isMammal()
        Animal: +mate()
        class Duck{
            +String beakColor
            +swim()
            +quack()
        }
        class Fish{
            -int sizeInFeet
            -canEat()
        }
        class Zebra{
            +bool is_wild
            +run()
        }
        `,
    image: 'https://mermaid.ink/img/classDiagram'
  },
  {
    value: 'stateDiagram',
    label: 'State Diagram',
    example: `
    stateDiagram
        [*] --> Still
        Still --> [*]

        Still --> Moving
        Moving --> Still
        Moving --> Crash
        Crash --> [*]
    `,
    image: 'https://mermaid.ink/img/stateDiagram-v2'
  },
  {
    value: 'erDiagram',
    label: 'ER Diagram',
    example: `
    erDiagram
        CUSTOMER ||--o{ ORDER : places
        ORDER ||--|{ LINE-ITEM : contains
        CUSTOMER }|..|{ DELIVERY-ADDRESS : uses
    `,
    image: 'https://mermaid.ink/img/erDiagram'
  },
  {
    value: 'journey',
    label: 'User Journey',
    example: `
    journey
        title My working day
        section Go to work
          Make tea: 5: Me
          Go upstairs: 3: Me
          Do work: 1: Me, Cat
        section Go home
          Go downstairs: 5: Me
          Sit down: 5: Me
    `,
    image: 'https://mermaid.ink/img/journey'
  },
  {
    value: 'gantt',
    label: 'Gantt Chart',
    example: `
    gantt
    dateFormat  YYYY-MM-DD
    title Adding GANTT diagram to mermaid
    excludes weekdays 2014-01-10

    section A section
    Completed task            :done,    des1, 2014-01-06,2014-01-08
    Active task               :active,  des2, 2014-01-09, 3d
    Future task               :         des3, after des2, 5d
    Future task2              :         des4, after des3, 5d
    `,
    image: 'https://mermaid.ink/img/gantt'
  },
  {
    value: 'pie',
    label: 'Pie Chart',
    example: `
    pie title Pets adopted by volunteers
        "Dogs" : 386
        "Cats" : 85
        "Rats" : 15
    `,
    image: 'https://mermaid.ink/img/pie'
  },
  {
    value: 'quadrantChart',
    label: 'Quadrant Chart',
    example: `
    quadrantChart
        title Reach and engagement of campaigns
        x-axis Low Reach --> High Reach
        y-axis Low Engagement --> High Engagement
        quadrant-1 We should expand
        quadrant-2 Need to promote
        quadrant-3 Re-evaluate
        quadrant-4 May be improved
        Campaign A: [0.3, 0.6]
        Campaign B: [0.45, 0.23]
        Campaign C: [0.57, 0.69]
        Campaign D: [0.78, 0.34]
        Campaign E: [0.40, 0.34]
        Campaign F: [0.35, 0.78]
    `,
    image: 'https://mermaid.ink/img/quadrantChart'
  },
  {
    value: 'requirementDiagram',
    label: 'Requirement Diagram',
    example: 'requirementDiagram\n    title My Requirement Diagram\n    "Requirement 1" : 10\n    "Requirement 2" : 20\n    "Requirement 3" : 30\n    "Requirement 4" : 40',
    image: 'https://mermaid.ink/img/requirementDiagram'
  },
  {
    value: 'gitGraph',
    label: 'Gitgraph Diagram',
    example: `
    gitGraph
        commit
        commit
        branch develop
        commit
        commit
        commit
        checkout main
        commit
        commit
    `,
    image: 'https://mermaid.ink/img/gitGraph'
  },
  {
    value: 'mindmap',
    label: 'Mind Map',
    example: `
    mindmap
      root((mindmap))
        Origins
          Long history
          ::icon(fa fa-book)
          Popularisation
            British popular psychology author Tony Buzan
        Research
          On effectiveness<br/>and features
          On Automatic creation
            Uses
                Creative techniques
                Strategic planning
                Argument mapping
        Tools
          Pen and paper
          Mermaid
    `,
    image: 'https://mermaid.ink/img/mindmap'
  },
  {
    value: 'timeline',
    label: 'Timeline',
    example: `
    timeline
        title History of Social Media Platform
        2002 : LinkedIn
        2004 : Facebook
             : Google
        2005 : YouTube
        2006 : Twitter
    `,
    image: 'https://mermaid.ink/img/timeline'
  },
];

