export interface FileContext {
  filePath: string;
  fileName: string;
  fileType: 'COBOL' | 'VB.NET' | 'C#' | 'UNKNOWN';
  lastModified: Date;
  svnInfo?: SVNInfo;
  relatedFiles: RelatedFile[];
  directCalls: string[];
  knownConflicts: string[];
  primaryPurpose?: string;
}

export interface SVNInfo {
  lastAuthor: string;
  lastRevision: string;
  lastCommitDate: Date;
  lastCommitMessage: string;
  recentLogs: SVNLog[];
}

export interface SVNLog {
  revision: string;
  author: string;
  date: Date;
  message: string;
  files: string[];
}

export interface RelatedFile {
  path: string;
  relation: 'calls' | 'called-by' | 'includes' | 'data-dependency';
  confidence: number;
}

export interface JiraIssue {
  key: string;
  summary: string;
  status: string;
  url: string;
}

export interface MondayItem {
  id: string;
  name: string;
  url: string;
}

export interface ContextDigest {
  lastModifiedBy: string;
  lastModifiedDate: string;
  primaryPurpose: string;
  directCalls: string[];
  knownDataConflicts: string[];
  relatedFiles: string[];
  recentChanges: string[];
  jiraIssues: JiraIssue[];
  mondayItems: MondayItem[];
  additionalNotes: string[];
}

export interface ParsedCode {
  functions: CodeFunction[];
  dataStructures: DataStructure[];
  dependencies: string[];
  comments: CodeComment[];
}

export interface CodeFunction {
  name: string;
  startLine: number;
  endLine: number;
  calls: string[];
  description?: string;
}

export interface DataStructure {
  name: string;
  type: string;
  fields?: Array<{ name: string; type: string }>;
}

export interface CodeComment {
  line: number;
  text: string;
  type: 'single-line' | 'multi-line' | 'documentation';
}
