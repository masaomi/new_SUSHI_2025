export interface Project { 
  number: number;
}

export interface UserProjectsResponse { 
  projects: Project[]; 
  current_user: string;
}
