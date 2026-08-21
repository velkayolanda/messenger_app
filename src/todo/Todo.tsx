import React, { useState, useEffect, useCallback } from 'react';
import { TodoItem } from './types';
import { todosToCsv, downloadCsv } from './csvExport';
import './todo.css';

interface TodoProps {
    onClose: () => void;
}

function generateLocalId(): string {
    return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function Todo({ onClose }: TodoProps) {
    const [items, setItems] = useState<TodoItem[]>([]);
    const [newTitle, setNewTitle] = useState('');
    const [newDueDate, setNewDueDate] = useState('');
    const [filter, setFilter] = useState<'all' | 'week' | 'overdue'>('all');

    useEffect(() => {
        const load = async () => {
            if (window.electronAPI) {
                const savedJson = await window.electronAPI.getLocalTodos();
                if (savedJson) {
                    try {
                        setItems(JSON.parse(savedJson));
                    } catch {
                        // ignore corrupt saved data
                    }
                }
            } else {
                const saved = window.localStorage.getItem('local_todos');
                if (saved) {
                    try {
                        setItems(JSON.parse(saved));
                    } catch {
                        // ignore
                    }
                }
            }
        };
        load();
    }, []);

    useEffect(() => {
        const json = JSON.stringify(items);
        if (window.electronAPI) {
            window.electronAPI.saveLocalTodos(json);
        } else {
            window.localStorage.setItem('local_todos', json);
        }
    }, [items]);

    const addItem = useCallback(() => {
        if (!newTitle.trim()) return;

        setItems(prev => [
            ...prev,
            {
                id: generateLocalId(),
                title: newTitle.trim(),
                dueDate: newDueDate ? new Date(newDueDate).toISOString() : undefined,
                completed: false
            }
        ]);

        setNewTitle('');
        setNewDueDate('');
    }, [newTitle, newDueDate]);

    const toggleComplete = useCallback((id: string) => {
        setItems(prev => prev.map(item => (item.id === id ? { ...item, completed: !item.completed } : item)));
    }, []);

    const deleteItem = useCallback((id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
    }, []);

    const exportCsv = useCallback(() => {
        const csv = todosToCsv(items);
        const dateStamp = new Date().toISOString().slice(0, 10);
        downloadCsv(csv, `todos-${dateStamp}.csv`);
    }, [items]);

    const sortedItems = [...items].sort((a, b) => {
        if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
    });

    const getWeekBounds = () => {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(now);
        monday.setHours(0, 0, 0, 0);
        monday.setDate(monday.getDate() + diffToMonday);
        const nextMonday = new Date(monday);
        nextMonday.setDate(monday.getDate() + 7);
        return { start: monday, end: nextMonday };
    };

    const visibleItems = sortedItems.filter(item => {
        if (filter === 'all') return true;
        if (!item.dueDate) return true;

        const due = new Date(item.dueDate);

        if (filter === 'week') {
            const { start, end } = getWeekBounds();
            return due >= start && due < end;
        }

        if (filter === 'overdue') {
            return due < new Date() && !item.completed;
        }

        return true;
    });

    return (
        <aside className="todo-sidebar">
            <button className="close-todo" onClick={onClose}>Close</button>
            <h2>TODO</h2>

            <div className="todo-add-form">
                <input
                    type="text"
                    placeholder="Add a task..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addItem()}
                    className="todo-input"
                />
                <input
                    type="datetime-local"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="todo-date-input"
                />
                <button onClick={addItem} className="todo-add-button">Add</button>
            </div>

            <div className="todo-toolbar">
                <div className="todo-filter-tabs">
                    <button
                        className={`todo-filter-tab ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        All
                    </button>
                    <button
                        className={`todo-filter-tab ${filter === 'week' ? 'active' : ''}`}
                        onClick={() => setFilter('week')}
                    >
                        This Week
                    </button>
                    <button
                        className={`todo-filter-tab ${filter === 'overdue' ? 'active' : ''}`}
                        onClick={() => setFilter('overdue')}
                    >
                        Overdue
                    </button>
                </div>
                <button className="todo-export-button" onClick={exportCsv} title="Export as CSV">
                    Export CSV
                </button>
            </div>

            <div className="todo-list">
                {visibleItems.length === 0 && (
                    <p className="todo-empty">
                        {items.length === 0 ? 'Nothing here yet. Add a task above.' : 'Nothing matches this filter.'}
                    </p>
                )}
                {visibleItems.map(item => (
                    <div key={item.id} className={`todo-row ${item.completed ? 'completed' : ''}`}>
                        <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => toggleComplete(item.id)}
                        />
                        <div className="todo-row-text">
                            <span className="todo-row-title">{item.title}</span>
                            {item.dueDate && (
                                <span className="todo-row-date">
                                    {new Date(item.dueDate).toLocaleString([], {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </span>
                            )}
                        </div>
                        <button className="todo-delete" onClick={() => deleteItem(item.id)} aria-label="Delete">
                            &times;
                        </button>
                    </div>
                ))}
            </div>
        </aside>
    );
}

export default Todo;