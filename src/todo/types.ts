export interface TodoItem {
    id: string;
    title: string;
    notes?: string;
    dueDate?: string; // ISO datetime, optional
    completed: boolean;
}