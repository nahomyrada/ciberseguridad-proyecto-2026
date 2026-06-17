'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import api from '@/utils/api';
import {
    Zap,
    Search,
    Plus,
    X,
    Loader2,
    CheckCircle2,
    Trash2,
    AlertCircle
} from 'lucide-react';
import clsx from 'clsx';

interface Skill {
    id: number;
    name: string;
    category: string | null;
    proficiency?: number;
}

const PROFICIENCY_LEVELS = [
    { value: 1, label: 'Principiante' },
    { value: 4, label: 'Intermedio' },
    { value: 7, label: 'Avanzado' },
    { value: 10, label: 'Maestro' },
];

export default function SkillsPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    const [allSkills, setAllSkills] = useState<Skill[]>([]);
    const [mySkills, setMySkills] = useState<Skill[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [updating, setUpdating] = useState<number | null>(null);
    const [addingSkill, setAddingSkill] = useState<number | null>(null); // To show level selector
    const [selectedLevel, setSelectedLevel] = useState<number>(4);

    useEffect(() => {
        if (!isLoading && !user) router.push('/login');
    }, [user, isLoading, router]);

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            try {
                const [allRes, myRes] = await Promise.all([
                    api.get('/api/skills'),
                    api.get('/api/skills/me')
                ]);
                setAllSkills(allRes.data.data);
                setMySkills(myRes.data.data);
            } catch (error) {
                console.error('Error fetching skills:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    const handleAddSkill = async (skillId: number) => {
        setUpdating(skillId);
        try {
            await api.post('/api/skills/me', { skillId, proficiency: selectedLevel });
            const skill = allSkills.find(s => s.id === skillId);
            if (skill) {
                setMySkills(prev => [...prev.filter(s => s.id !== skillId), { ...skill, proficiency: selectedLevel }]);
            }
            setAddingSkill(null);
        } catch (err) {
            console.error('Error adding skill:', err);
        } finally {
            setUpdating(null);
        }
    };

    const handleRemoveSkill = async (skillId: number) => {
        if (!confirm('¿Estás seguro de que quieres eliminar esta habilidad de tu perfil?')) return;
        setUpdating(skillId);
        try {
            await api.delete(`/api/skills/me/${skillId}`);
            setMySkills(prev => prev.filter(s => s.id !== skillId));
        } catch (err) {
            console.error('Error removing skill:', err);
        } finally {
            setUpdating(null);
        }
    };

    const filteredSkills = allSkills.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) &&
        !mySkills.some(ms => ms.id === s.id)
    );

    if (isLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="mb-8">
                <h1 className="page-title text-slate-100">Mis Habilidades</h1>
                <p className="page-subtitle text-slate-400">Define tu stack tecnológico para encontrar mejores ofertas</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Lado izquierdo: Mis habilidades actuales */}
                <div className="lg:col-span-2 space-y-6">
                    <section className="card">
                        <h2 className="text-lg font-semibold text-slate-100 mb-6 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-yellow-400" />
                            Stack Seleccionado
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {mySkills.length > 0 ? (
                                mySkills.map((skill) => (
                                    <div key={skill.id} className="p-4 bg-dark-800/50 border border-slate-700/50 rounded-xl group">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h4 className="font-bold text-slate-100">{skill.name}</h4>
                                                <span className="text-xs text-slate-500 uppercase tracking-wider">{skill.category || 'General'}</span>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveSkill(skill.id)}
                                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs font-medium">
                                                <span className="text-brand-400">Nivel de maestría</span>
                                                <span className="text-slate-300">
                                                    {PROFICIENCY_LEVELS.find(l => l.value >= (skill.proficiency || 0))?.label || 'Principiante'}
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full bg-dark-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-brand-600 to-blue-500 transition-all duration-500"
                                                    style={{ width: `${(skill.proficiency || 1) * 10}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full py-12 text-center bg-dark-800/20 border border-dashed border-slate-700 rounded-2xl">
                                    <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                                    <p className="text-slate-400">Aún no has seleccionado ninguna habilidad.</p>
                                    <p className="text-sm text-slate-500">Búscalas en el panel lateral para empezar.</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* Lado derecho: Buscador de habilidades */}
                <div className="space-y-6">
                    <section className="card sticky top-24">
                        <h2 className="text-lg font-semibold text-slate-100 mb-6">Añadir Habilidades</h2>

                        <div className="relative mb-6">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Buscar (React, Node, etc)..."
                                className="input-field pl-10"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                            {filteredSkills.length > 0 ? (
                                filteredSkills.map((skill) => (
                                    <div
                                        key={skill.id}
                                        className="flex flex-col p-3 rounded-xl bg-dark-800/30 border border-slate-800 hover:border-brand-500/30 hover:bg-brand-500/5 transition-all group"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div>
                                                <p className="font-medium text-slate-200">{skill.name}</p>
                                                <p className="text-[10px] text-slate-500 uppercase tracking-tighter">{skill.category}</p>
                                            </div>
                                            {addingSkill !== skill.id ? (
                                                <button
                                                    onClick={() => setAddingSkill(skill.id)}
                                                    className="p-1.5 bg-brand-600/10 text-brand-400 hover:bg-brand-600 hover:text-white rounded-lg transition-all"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => setAddingSkill(null)}
                                                    className="p-1.5 text-slate-500 hover:text-white rounded-lg transition-all"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>

                                        {addingSkill === skill.id && (
                                            <div className="pt-2 border-t border-slate-800 animate-in fade-in slide-in-from-top-1 duration-200">
                                                <p className="text-[10px] text-slate-500 uppercase font-black mb-2 tracking-widest">Nivel de maestría</p>
                                                <div className="flex flex-wrap gap-1.5 mb-3">
                                                    {PROFICIENCY_LEVELS.map((level) => (
                                                        <button
                                                            key={level.value}
                                                            onClick={() => setSelectedLevel(level.value)}
                                                            className={clsx(
                                                                "px-2 py-1 rounded-md text-[10px] font-bold transition-all border",
                                                                selectedLevel === level.value
                                                                    ? "bg-brand-600 border-brand-500 text-white"
                                                                    : "bg-dark-800 border-slate-700 text-slate-400 hover:text-slate-200"
                                                            )}
                                                        >
                                                            {level.label}
                                                        </button>
                                                    ))}
                                                </div>
                                                <button
                                                    onClick={() => handleAddSkill(skill.id)}
                                                    disabled={updating === skill.id}
                                                    className="w-full py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-600/20"
                                                >
                                                    {updating === skill.id ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <CheckCircle2 className="w-3 h-3" />
                                                    )}
                                                    Confirmar Nivel
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-sm text-slate-500 py-4">
                                    {search ? 'Sin resultados' : 'Escribe para buscar'}
                                </p>
                            )}
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-800">
                            <div className="p-4 bg-brand-500/5 border border-brand-500/20 rounded-xl">
                                <p className="text-xs text-brand-300 leading-relaxed text-center italic">
                                    "El bot usará estas habilidades para filtrar y priorizar las propuestas que genera para Facebook, Upwork y más."
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
