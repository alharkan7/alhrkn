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
  docs: string;
}

export const DIAGRAM_TYPES: DiagramType[] = [
  {
    value: 'graph TD',
    label: 'Flowchart (TD)',
    example: `
    graph TD
        A[Enter Chart Definition] --> B(Preview)
        B --> C{decide}
        C --> D[Keep]
        C --> E[Edit Definition]
        E --> B
        D --> F[Save Image and Code]
        F --> B
    `,
    image: '/inztagram/graph-td.svg',
    docs: 'flowchart'
  },
  {
    value: 'graph LR',
    label: 'Flowchart (LR)',
    example: `
    graph LR
        A[Enter Chart Definition] --> B(Preview)
        B --> C{decide}
        C --> D[Keep]
        C --> E[Edit Definition]
        E --> B
        D --> F[Save Image and Code]
        F --> B
    `,
    image: '/inztagram/graph-lr.svg',
    docs: 'flowchart'
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
    image: '/inztagram/sequenceDiagram.svg',
    docs: 'sequenceDiagram'
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
    image: '/inztagram/classDiagram.svg',
    docs: 'classDiagram'
  },
  {
    value: 'stateDiagram',
    label: 'State Diagram',
    example: `
    stateDiagram
        [*] --> First
        state First {
            [*] --> second
            second --> [*]
        }

        [*] --> NamedComposite
        NamedComposite: Another Composite
        state NamedComposite {
            [*] --> namedSimple
            namedSimple --> [*]
            namedSimple: Another simple
        }
    `,
    image: '/inztagram/stateDiagram.svg',
    docs: 'stateDiagram'
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
    image: '/inztagram/erDiagram.svg',
    docs: 'entityRelationshipDiagram'
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
    image: '/inztagram/journey.svg',
    docs: 'userJourney'
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
    image: '/inztagram/gantt.svg',
    docs: 'gantt'
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
    image: '/inztagram/pie.svg',
    docs: 'pie'
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
    image: '/inztagram/quadrantChart.svg',
    docs: 'quadrantChart'
  },
  {
    value: 'requirementDiagram',
    label: 'Requirement Diagram',
    example: `
    requirementDiagram

    requirement test_req {
    id: 1
    text: the test text.
    risk: high
    verifymethod: test
    }

    element test_entity {
    type: simulation
    }

    test_entity - satisfies -> test_req
    `,
    image: '/inztagram/requirementDiagram.svg',
    docs: 'requirementDiagram'
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
    image: '/inztagram/gitGraph.svg',
    docs: 'gitGraph'
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
    image: '/inztagram/mindmap.svg',
    docs: 'mindmap'
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
    image: '/inztagram/timeline.svg',
    docs: 'timeline'
  },
];

