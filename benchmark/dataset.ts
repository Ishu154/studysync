export type DiagramType = 'binary_tree' | 'flowchart' | 'mind_map' | 'state_machine' | 'er_diagram';
export type DifficultyTier = 'easy' | 'medium' | 'hard';

export interface ExpectedGraph {
  minNodes: number;
  maxNodes: number;
  minEdges: number;
  expectedLabels: string[];
  expectedEdges?: Array<{ from: string; to: string }>;
}

export interface BenchmarkPrompt {
  id: string;
  type: DiagramType;
  difficulty: DifficultyTier;
  title: string;
  prompt: string;
  expected: ExpectedGraph;
}

export const BENCHMARK_PROMPTS: BenchmarkPrompt[] = [
  // ==========================================
  // 1. BINARY TREE (8 prompts)
  // ==========================================
  {
    id: 'BT-01',
    type: 'binary_tree',
    difficulty: 'easy',
    title: 'Simple 3-Node Binary Tree',
    prompt: 'Draw a simple binary tree with root 10, left child 5, and right child 15',
    expected: {
      minNodes: 3,
      maxNodes: 5,
      minEdges: 2,
      expectedLabels: ['10', '5', '15'],
      expectedEdges: [{ from: '10', to: '5' }, { from: '10', to: '15' }],
    },
  },
  {
    id: 'BT-02',
    type: 'binary_tree',
    difficulty: 'easy',
    title: 'Two-Level Family Tree',
    prompt: 'Draw a binary tree with parent "Root", left child "Left Child", and right child "Right Child"',
    expected: {
      minNodes: 3,
      maxNodes: 5,
      minEdges: 2,
      expectedLabels: ['Root', 'Left', 'Right'],
    },
  },
  {
    id: 'BT-03',
    type: 'binary_tree',
    difficulty: 'medium',
    title: 'Balanced Binary Search Tree (BST)',
    prompt: 'Draw a balanced binary search tree containing values: 8 (root), 4, 12, 2, 6, 10, 14',
    expected: {
      minNodes: 7,
      maxNodes: 9,
      minEdges: 6,
      expectedLabels: ['8', '4', '12', '2', '6', '10', '14'],
    },
  },
  {
    id: 'BT-04',
    type: 'binary_tree',
    difficulty: 'medium',
    title: 'Min-Heap Tree',
    prompt: 'Draw a min-heap binary tree with root 1, children 3 and 6, and grandchildren 5, 9, 8',
    expected: {
      minNodes: 6,
      maxNodes: 8,
      minEdges: 5,
      expectedLabels: ['1', '3', '6', '5', '9', '8'],
    },
  },
  {
    id: 'BT-05',
    type: 'binary_tree',
    difficulty: 'medium',
    title: 'Arithmetic Expression Tree',
    prompt: 'Draw an expression tree for the formula (A + B) * (C - D)',
    expected: {
      minNodes: 7,
      maxNodes: 9,
      minEdges: 6,
      expectedLabels: ['*', '+', '-', 'A', 'B', 'C', 'D'],
    },
  },
  {
    id: 'BT-06',
    type: 'binary_tree',
    difficulty: 'hard',
    title: 'AVL Tree with Balance Factors',
    prompt: 'Draw an AVL tree showing nodes 50 (bf: 0), left subtree 30 and 40, right subtree 70, 60, and 80',
    expected: {
      minNodes: 6,
      maxNodes: 8,
      minEdges: 5,
      expectedLabels: ['50', '30', '40', '70', '60', '80'],
    },
  },
  {
    id: 'BT-07',
    type: 'binary_tree',
    difficulty: 'hard',
    title: 'Complete Binary Tree 10 Nodes',
    prompt: 'Draw a complete binary tree numbered 1 through 10 in level-order layout',
    expected: {
      minNodes: 10,
      maxNodes: 12,
      minEdges: 9,
      expectedLabels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    },
  },
  {
    id: 'BT-08',
    type: 'binary_tree',
    difficulty: 'hard',
    title: 'Trie Prefix Tree for Vocabulary',
    prompt: 'Draw a prefix trie tree branching from root for words: "car", "cat", "card", and "cot"',
    expected: {
      minNodes: 7,
      maxNodes: 12,
      minEdges: 6,
      expectedLabels: ['c', 'a', 'r', 't', 'd', 'o'],
    },
  },

  // ==========================================
  // 2. FLOWCHART (8 prompts)
  // ==========================================
  {
    id: 'FC-01',
    type: 'flowchart',
    difficulty: 'easy',
    title: 'Linear 3-Step Process',
    prompt: 'Draw a simple linear flowchart: Start -> Calculate Total -> Print Invoice -> End',
    expected: {
      minNodes: 4,
      maxNodes: 6,
      minEdges: 3,
      expectedLabels: ['Start', 'Calculate', 'Print', 'End'],
    },
  },
  {
    id: 'FC-02',
    type: 'flowchart',
    difficulty: 'easy',
    title: 'Even/Odd Decision Branch',
    prompt: 'Draw a flowchart to check if a number is even: Start -> Input Number -> Is N % 2 == 0? -> If Yes: Even, If No: Odd -> End',
    expected: {
      minNodes: 5,
      maxNodes: 7,
      minEdges: 5,
      expectedLabels: ['Start', 'Input', 'Even', 'Odd', 'End'],
    },
  },
  {
    id: 'FC-03',
    type: 'flowchart',
    difficulty: 'medium',
    title: 'User Login with Retry Loop',
    prompt: 'Draw an authentication flowchart: Enter Credentials -> Validate Password -> Success? (Yes -> Dashboard, No -> Increment Attempts -> Attempts > 3? (Yes -> Lockout, No -> Re-enter))',
    expected: {
      minNodes: 6,
      maxNodes: 9,
      minEdges: 6,
      expectedLabels: ['Credentials', 'Validate', 'Dashboard', 'Attempts', 'Lockout'],
    },
  },
  {
    id: 'FC-04',
    type: 'flowchart',
    difficulty: 'medium',
    title: 'E-Commerce Checkout Pipeline',
    prompt: 'Draw a checkout flowchart: View Cart -> Enter Shipping -> Select Payment -> Process Card -> Payment Success? -> Send Email Receipt -> Order Confirmed',
    expected: {
      minNodes: 6,
      maxNodes: 8,
      minEdges: 5,
      expectedLabels: ['Cart', 'Shipping', 'Payment', 'Process', 'Receipt', 'Confirmed'],
    },
  },
  {
    id: 'FC-05',
    type: 'flowchart',
    difficulty: 'medium',
    title: 'Password Reset Flow',
    prompt: 'Draw a password reset flowchart: Request Reset -> Generate Token -> Email Link -> User Clicks Link -> Token Expired? -> If Valid: Enter New Password -> Update DB -> Login',
    expected: {
      minNodes: 7,
      maxNodes: 9,
      minEdges: 6,
      expectedLabels: ['Request', 'Token', 'Email', 'Expired', 'Password', 'Update', 'Login'],
    },
  },
  {
    id: 'FC-06',
    type: 'flowchart',
    difficulty: 'hard',
    title: 'CI/CD Pipeline with Automated Testing',
    prompt: 'Draw a CI/CD pipeline flowchart: Git Push -> Lint Check -> Run Unit Tests -> Tests Pass? (No -> Notify Dev) -> Build Docker Image -> Deploy to Staging -> Run E2E Tests -> Production Deploy',
    expected: {
      minNodes: 8,
      maxNodes: 11,
      minEdges: 8,
      expectedLabels: ['Push', 'Lint', 'Unit Tests', 'Docker', 'Staging', 'E2E', 'Production'],
    },
  },
  {
    id: 'FC-07',
    type: 'flowchart',
    difficulty: 'hard',
    title: 'ATM Cash Withdrawal with Rollback',
    prompt: 'Draw an ATM cash withdrawal flowchart: Insert Card -> Enter PIN -> PIN Valid? -> Choose Amount -> Sufficient Balance? -> Dispense Cash -> Deduct Account -> Print Receipt -> Eject Card',
    expected: {
      minNodes: 8,
      maxNodes: 11,
      minEdges: 8,
      expectedLabels: ['Card', 'PIN', 'Amount', 'Balance', 'Cash', 'Deduct', 'Receipt'],
    },
  },
  {
    id: 'FC-08',
    type: 'flowchart',
    difficulty: 'hard',
    title: 'Distributed Saga Pattern with Compensating Tx',
    prompt: 'Draw a distributed transaction saga flowchart: Order Created -> Reserve Inventory -> Inventory OK? -> Process Payment -> Payment OK? (No -> Release Inventory) -> Dispatch Delivery -> Complete',
    expected: {
      minNodes: 7,
      maxNodes: 10,
      minEdges: 7,
      expectedLabels: ['Order', 'Inventory', 'Payment', 'Release', 'Delivery', 'Complete'],
    },
  },

  // ==========================================
  // 3. MIND MAP (8 prompts)
  // ==========================================
  {
    id: 'MM-01',
    type: 'mind_map',
    difficulty: 'easy',
    title: 'Fruit Classification',
    prompt: 'Draw a mind map for Fruit with categories: Citrus, Berries, and Tropical',
    expected: {
      minNodes: 4,
      maxNodes: 7,
      minEdges: 3,
      expectedLabels: ['Fruit', 'Citrus', 'Berries', 'Tropical'],
    },
  },
  {
    id: 'MM-02',
    type: 'mind_map',
    difficulty: 'easy',
    title: 'Frontend Fundamentals',
    prompt: 'Draw a mind map for Web Frontend: HTML (Structure), CSS (Styling), and JavaScript (Interactivity)',
    expected: {
      minNodes: 4,
      maxNodes: 7,
      minEdges: 3,
      expectedLabels: ['Frontend', 'HTML', 'CSS', 'JavaScript'],
    },
  },
  {
    id: 'MM-03',
    type: 'mind_map',
    difficulty: 'medium',
    title: 'Photosynthesis Overview',
    prompt: 'Draw a mind map of Photosynthesis with branches: Light Reactions (Thylakoid, ATP, NADPH), Calvin Cycle (Stroma, Glucose), Inputs (CO2, H2O, Light), and Outputs (Oxygen, Sugar)',
    expected: {
      minNodes: 7,
      maxNodes: 11,
      minEdges: 6,
      expectedLabels: ['Photosynthesis', 'Light Reactions', 'Calvin Cycle', 'Inputs', 'Outputs'],
    },
  },
  {
    id: 'MM-04',
    type: 'mind_map',
    difficulty: 'medium',
    title: 'Operating Systems Core Components',
    prompt: 'Draw a mind map for Operating Systems: Process Management (Threads, Scheduling), Memory (Paging, Virtual Memory), Storage (File System), and Device I/O',
    expected: {
      minNodes: 7,
      maxNodes: 11,
      minEdges: 6,
      expectedLabels: ['Operating Systems', 'Process', 'Memory', 'Storage', 'I/O'],
    },
  },
  {
    id: 'MM-05',
    type: 'mind_map',
    difficulty: 'medium',
    title: 'Machine Learning Subfields',
    prompt: 'Draw a mind map of Machine Learning: Supervised (Classification, Regression), Unsupervised (Clustering, Dimensionality Reduction), and Reinforcement (Q-Learning, Policy Gradient)',
    expected: {
      minNodes: 7,
      maxNodes: 11,
      minEdges: 6,
      expectedLabels: ['Machine Learning', 'Supervised', 'Unsupervised', 'Reinforcement'],
    },
  },
  {
    id: 'MM-06',
    type: 'mind_map',
    difficulty: 'hard',
    title: 'OSI 7-Layer Reference Model',
    prompt: 'Draw a mind map for OSI 7-Layer Network Model: Application, Presentation, Session, Transport (TCP/UDP), Network (IP), Data Link (MAC), Physical (Cables)',
    expected: {
      minNodes: 8,
      maxNodes: 12,
      minEdges: 7,
      expectedLabels: ['OSI', 'Application', 'Presentation', 'Session', 'Transport', 'Network', 'Data Link', 'Physical'],
    },
  },
  {
    id: 'MM-07',
    type: 'mind_map',
    difficulty: 'hard',
    title: 'RDBMS Architecture Components',
    prompt: 'Draw a mind map for Relational Database Engine Architecture: Query Engine (Parser, Optimizer), Storage Engine (B+ Trees, Buffer Pool), Transaction Manager (ACID, Locks), and WAL Log',
    expected: {
      minNodes: 8,
      maxNodes: 12,
      minEdges: 7,
      expectedLabels: ['Database Engine', 'Query Engine', 'Storage Engine', 'Transaction', 'WAL'],
    },
  },
  {
    id: 'MM-08',
    type: 'mind_map',
    difficulty: 'hard',
    title: 'Software Design Patterns Taxonomy',
    prompt: 'Draw a mind map of Design Patterns: Creational (Singleton, Factory, Builder), Structural (Adapter, Decorator, Facade), and Behavioral (Observer, Strategy, State)',
    expected: {
      minNodes: 9,
      maxNodes: 14,
      minEdges: 8,
      expectedLabels: ['Design Patterns', 'Creational', 'Structural', 'Behavioral', 'Factory', 'Observer'],
    },
  },

  // ==========================================
  // 4. STATE MACHINE (8 prompts)
  // ==========================================
  {
    id: 'SM-01',
    type: 'state_machine',
    difficulty: 'easy',
    title: 'Light Switch State Machine',
    prompt: 'Draw a state machine for a light switch with states "OFF" and "ON" connected by toggle transitions',
    expected: {
      minNodes: 2,
      maxNodes: 4,
      minEdges: 2,
      expectedLabels: ['OFF', 'ON'],
      expectedEdges: [{ from: 'OFF', to: 'ON' }, { from: 'ON', to: 'OFF' }],
    },
  },
  {
    id: 'SM-02',
    type: 'state_machine',
    difficulty: 'easy',
    title: 'Traffic Light Cycle',
    prompt: 'Draw a state machine for traffic lights: Green -> Yellow -> Red -> Green',
    expected: {
      minNodes: 3,
      maxNodes: 4,
      minEdges: 3,
      expectedLabels: ['Green', 'Yellow', 'Red'],
    },
  },
  {
    id: 'SM-03',
    type: 'state_machine',
    difficulty: 'medium',
    title: 'Video Player Playback States',
    prompt: 'Draw a state machine for a video player: Idle -> Loading -> Playing <-> Paused, Buffering -> Playing, and Playing -> Finished -> Idle',
    expected: {
      minNodes: 5,
      maxNodes: 7,
      minEdges: 5,
      expectedLabels: ['Idle', 'Loading', 'Playing', 'Paused', 'Buffering'],
    },
  },
  {
    id: 'SM-04',
    type: 'state_machine',
    difficulty: 'medium',
    title: 'Subway Turnstile Gate',
    prompt: 'Draw a state machine for a subway turnstile: Locked and Unlocked. Event "Coin" moves Locked -> Unlocked. Event "Push" moves Unlocked -> Locked',
    expected: {
      minNodes: 2,
      maxNodes: 4,
      minEdges: 2,
      expectedLabels: ['Locked', 'Unlocked'],
    },
  },
  {
    id: 'SM-05',
    type: 'state_machine',
    difficulty: 'medium',
    title: 'TCP Connection States',
    prompt: 'Draw a state machine for TCP handshake and teardown: CLOSED -> SYN_SENT -> ESTABLISHED -> FIN_WAIT_1 -> TIME_WAIT -> CLOSED',
    expected: {
      minNodes: 5,
      maxNodes: 7,
      minEdges: 5,
      expectedLabels: ['CLOSED', 'SYN_SENT', 'ESTABLISHED', 'FIN_WAIT', 'TIME_WAIT'],
    },
  },
  {
    id: 'SM-06',
    type: 'state_machine',
    difficulty: 'hard',
    title: 'Order Lifecycle State Machine',
    prompt: 'Draw a state machine for an e-commerce order: Placed -> Payment Pending -> Paid -> In Warehouse -> Shipped -> Delivered. Also transitions: Payment Pending -> Cancelled, and Delivered -> Returned',
    expected: {
      minNodes: 7,
      maxNodes: 9,
      minEdges: 7,
      expectedLabels: ['Placed', 'Payment Pending', 'Paid', 'Warehouse', 'Shipped', 'Delivered', 'Cancelled'],
    },
  },
  {
    id: 'SM-07',
    type: 'state_machine',
    difficulty: 'hard',
    title: 'SaaS Subscription Lifecycle',
    prompt: 'Draw a state machine for a SaaS subscription: Trialing -> Active -> Past Due -> In Grace Period -> Suspended -> Churned. Active can also transition to Cancelled',
    expected: {
      minNodes: 6,
      maxNodes: 8,
      minEdges: 6,
      expectedLabels: ['Trialing', 'Active', 'Past Due', 'Grace Period', 'Suspended', 'Churned'],
    },
  },
  {
    id: 'SM-08',
    type: 'state_machine',
    difficulty: 'hard',
    title: 'Document Editorial Workflow',
    prompt: 'Draw a state machine for document publishing: Draft -> In Review -> Changes Requested -> In Review -> Approved -> Scheduled -> Published -> Archived',
    expected: {
      minNodes: 7,
      maxNodes: 9,
      minEdges: 7,
      expectedLabels: ['Draft', 'In Review', 'Changes Requested', 'Approved', 'Published', 'Archived'],
    },
  },

  // ==========================================
  // 5. ER DIAGRAM (8 prompts)
  // ==========================================
  {
    id: 'ER-01',
    type: 'er_diagram',
    difficulty: 'easy',
    title: 'User and Profile (1:1)',
    prompt: 'Draw an entity relationship diagram showing User entity (id, email) connected 1:1 to UserProfile entity (id, bio, avatar)',
    expected: {
      minNodes: 2,
      maxNodes: 4,
      minEdges: 1,
      expectedLabels: ['User', 'Profile'],
    },
  },
  {
    id: 'ER-02',
    type: 'er_diagram',
    difficulty: 'easy',
    title: 'Author and Book (1:N)',
    prompt: 'Draw an ER diagram with Author entity and Book entity with a 1-to-many relationship "Writes"',
    expected: {
      minNodes: 2,
      maxNodes: 4,
      minEdges: 1,
      expectedLabels: ['Author', 'Book'],
    },
  },
  {
    id: 'ER-03',
    type: 'er_diagram',
    difficulty: 'medium',
    title: 'Student Course Enrollment (N:M)',
    prompt: 'Draw an ER diagram with Student, Course, and Enrollment junction entity connecting them with grade and semester',
    expected: {
      minNodes: 3,
      maxNodes: 5,
      minEdges: 2,
      expectedLabels: ['Student', 'Course', 'Enrollment'],
    },
  },
  {
    id: 'ER-04',
    type: 'er_diagram',
    difficulty: 'medium',
    title: 'Hospital Appointment System',
    prompt: 'Draw an ER diagram with Doctor, Patient, Appointment, and Medical Record entities',
    expected: {
      minNodes: 4,
      maxNodes: 6,
      minEdges: 3,
      expectedLabels: ['Doctor', 'Patient', 'Appointment', 'Medical Record'],
    },
  },
  {
    id: 'ER-05',
    type: 'er_diagram',
    difficulty: 'medium',
    title: 'E-Commerce Schema',
    prompt: 'Draw an ER diagram showing Customer, Order, OrderItem, Product, and Category entities',
    expected: {
      minNodes: 5,
      maxNodes: 7,
      minEdges: 4,
      expectedLabels: ['Customer', 'Order', 'OrderItem', 'Product', 'Category'],
    },
  },
  {
    id: 'ER-06',
    type: 'er_diagram',
    difficulty: 'hard',
    title: 'University Department & Academic Schema',
    prompt: 'Draw an ER diagram with Department, Professor, Course, Section, Student, and Classroom entities with appropriate foreign key relationships',
    expected: {
      minNodes: 6,
      maxNodes: 8,
      minEdges: 5,
      expectedLabels: ['Department', 'Professor', 'Course', 'Section', 'Student', 'Classroom'],
    },
  },
  {
    id: 'ER-07',
    type: 'er_diagram',
    difficulty: 'hard',
    title: 'Social Media Platform Data Model',
    prompt: 'Draw an ER diagram with User, Post, Comment, Like, Follower, and Hashtag entities',
    expected: {
      minNodes: 6,
      maxNodes: 8,
      minEdges: 5,
      expectedLabels: ['User', 'Post', 'Comment', 'Like', 'Follower', 'Hashtag'],
    },
  },
  {
    id: 'ER-08',
    type: 'er_diagram',
    difficulty: 'hard',
    title: 'Airline Flight Reservation System',
    prompt: 'Draw an ER diagram with Airline, Flight, Airport (Origin/Destination), Aircraft, Booking, Passenger, and Seat entities',
    expected: {
      minNodes: 7,
      maxNodes: 9,
      minEdges: 6,
      expectedLabels: ['Flight', 'Airport', 'Aircraft', 'Booking', 'Passenger', 'Seat'],
    },
  },
];

