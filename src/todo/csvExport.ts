import { TodoItem } from './types';

function escapeCsvField(value: string): string {
    if (/[",\n]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

export function todosToCsv(items: TodoItem[]): string {
    const header = ['Title', 'Due Date', 'Completed', 'Notes'];
    const rows = items.map(item => [
        escapeCsvField(item.title),
        item.dueDate ? new Date(item.dueDate).toISOString() : '',
        item.completed ? 'Yes' : 'No',
        escapeCsvField(item.notes || '')
    ]);

    return [header, ...rows].map(row => row.join(',')).join('\n');
}

export function downloadCsv(csvContent: string, filename: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}