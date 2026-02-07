
import React, { useState, useEffect } from 'react';
import { AbsenceRequest } from '../types';
import CustomSelect from './CustomSelect';
import { IconX } from '@tabler/icons-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ABSENCE_REASONS } from '../constants';

interface EditRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (id: number, reasonType: string, description: string) => Promise<void>;
    request: AbsenceRequest;
    studentName: string;
}



const EditRequestModal: React.FC<EditRequestModalProps> = ({ isOpen, onClose, onSave, request, studentName }) => {
    const [reasonType, setReasonType] = useState(request.reason_type);
    const [description, setDescription] = useState('');
    const [classInfoPrefix, setClassInfoPrefix] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setReasonType(request.reason_type);

            const fullDesc = request.description || '';

            // Try new format first: [2025-12-23] Subject (Time) - Comment
            // Match: [date] subject (time) - comment
            const newFormatMatch = fullDesc.match(/^(\[\d{4}-\d{2}-\d{2}\]\s*[^)]+\))\s*-\s*(.*)$/s);

            if (newFormatMatch) {
                // Extract prefix (everything before the dash after closing paren) and comment
                const prefix = newFormatMatch[1].trim() + ' -';
                const comment = newFormatMatch[2].trim();
                setClassInfoPrefix(prefix);
                setDescription(comment);
                return;
            }

            // Try old format: [Subject (Time)] Comment
            const oldFormatMatch = fullDesc.match(/^(\[[^\]]+\])\s*(.*)$/s);

            if (oldFormatMatch) {
                const prefix = oldFormatMatch[1];
                let comment = oldFormatMatch[2] || '';

                // Check if the 'comment' part accidentally starts with the same prefix again
                if (comment.trim().startsWith(prefix)) {
                    comment = comment.replace(prefix, '').trim();
                }

                setClassInfoPrefix(prefix);
                setDescription(comment);
            } else {
                setClassInfoPrefix(null);
                setDescription(fullDesc);
            }
        }
    }, [isOpen, request]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!request.id) return;

        setIsSaving(true);

        // Reconstruct the full description string
        const finalDescription = classInfoPrefix
            ? `${classInfoPrefix} ${description}`.trim()
            : description.trim();

        await onSave(request.id, reasonType, finalDescription);
        setIsSaving(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-request-title"
        >
            <div
                className="relative bg-background w-full max-w-md m-4 rounded-lg border shadow-lg"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex flex-col space-y-1.5 p-6 border-b">
                    <h2 id="edit-request-title" className="text-lg font-semibold tracking-tight">Редактирование заявки</h2>
                    <p className="text-sm text-muted-foreground">Студент: {studentName}</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Причина отсутствия
                        </label>
                        <CustomSelect
                            options={ABSENCE_REASONS}
                            selectedValue={reasonType}
                            onValueChange={setReasonType}
                            placeholder="Выберите причину"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="edit-description" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {classInfoPrefix ? 'Комментарий студента' : 'Пояснение / Комментарий'}
                        </label>

                        {classInfoPrefix && (() => {
                            // Parse class info to display nicely
                            const dateMatch = classInfoPrefix.match(/\[(\d{4}-\d{2}-\d{2})\]/);
                            const subjectMatch = classInfoPrefix.match(/\]\s*([^(]+)\(/);
                            const timeMatch = classInfoPrefix.match(/\(([^)]+)\)/);

                            const date = dateMatch ? dateMatch[1] : '';
                            const subject = subjectMatch ? subjectMatch[1].trim() : '';
                            const time = timeMatch ? timeMatch[1] : '';

                            return (
                                <div className="text-xs px-3 py-2 bg-muted/50 rounded-lg border text-muted-foreground mb-2">
                                    <span className="font-semibold text-foreground">Занятие:</span>
                                    {subject && <> {subject}</>}
                                    {time && <> ({time})</>}
                                    {date && (
                                        <>
                                            <br />
                                            <span className="font-semibold text-foreground">Дата:</span> {date}
                                        </>
                                    )}
                                    <br />
                                    <span className="opacity-70 italic text-[10px]">(информация сохраняется автоматически)</span>
                                </div>
                            );
                        })()}

                        <Textarea
                            id="edit-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Введите комментарий..."
                            className="min-h-[100px]"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-4 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            disabled={isSaving}
                        >
                            Отмена
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSaving}
                        >
                            {isSaving ? 'Сохранение...' : 'Сохранить'}
                        </Button>
                    </div>
                </form>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted-foreground opacity-70 hover:opacity-100 h-8 w-8"
                    aria-label="Закрыть"
                >
                    <IconX className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
};

export default EditRequestModal;
