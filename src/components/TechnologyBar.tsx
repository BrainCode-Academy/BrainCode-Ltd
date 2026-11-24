import React, { useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Grid, Search, X } from 'lucide-react';
import type { Technology } from '../types';
import { TechGlyph } from './TechGlyph';

interface TechnologyBarProps {
  technologies: Technology[];
  activeSlug?: string;
  onSelectTechnology: (slug: string) => void;
}

export function TechnologyBar({ technologies, activeSlug, onSelectTechnology }: TechnologyBarProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'in_development' | 'coming_soon'>('all');

  const quickBarTechnologies = useMemo(() => technologies.slice(0, 36), [technologies]);

  const filteredDirectory = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    return technologies.filter((t) => {
      const learningStatus =
        t.learning_status || (Number(t.course_count || 0) > 0 ? 'available' : t.content_status || 'coming_soon');
      if (statusFilter !== 'all' && learningStatus !== statusFilter) return false;
      if (!q) return true;
      const aliasMatch = Array.isArray(t.aliases) && t.aliases.some((a) => a.toLowerCase().includes(q));
      return (
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.category_name || '').toLowerCase().includes(q) ||
        aliasMatch
      );
    });
  }, [technologies, filterText, statusFilter]);

  const scrollByAmount = (delta: number) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  };

  if (technologies.length === 0) return null;

  return (
    <>
      <div className="border-b border-[var(--border-default)] bg-[var(--bg-subtle)]">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 flex items-center gap-1.5 h-11">
          <button
            type="button"
            onClick={() => scrollByAmount(-240)}
            aria-label="Scroll technologies left"
            className="hidden sm:inline-flex items-center justify-center w-7 h-7 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] shrink-0 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <nav
            ref={scrollRef}
            aria-label="Technologies"
            className="flex-1 flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {quickBarTechnologies.map((tech) => {
              const isActive = activeSlug === tech.slug;
              return (
                <button
                  key={tech.id}
                  type="button"
                  onClick={() => onSelectTechnology(tech.slug)}
                  className={`h-11 px-2.5 sm:px-3 inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
                    isActive
                      ? 'border-[#0A84FF] text-[#0A84FF] dark:text-[#38BDF8] bg-[var(--bg-surface)]'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]/60'
                  }`}
                >
                  <span
                    className="font-mono text-[10px] font-semibold"
                    style={{ color: tech.brand_color && /^#[0-9A-Fa-f]{6}$/.test(tech.brand_color) ? tech.brand_color : undefined }}
                  >
                    {tech.icon_symbol || '</>'}
                  </span>
                  <span>{tech.name}</span>
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => scrollByAmount(240)}
            aria-label="Scroll technologies right"
            className="hidden sm:inline-flex items-center justify-center w-7 h-7 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] shrink-0 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setDirectoryOpen(true)}
            className="h-8 px-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[11px] font-semibold text-[var(--text-primary)] hover:border-[#0A84FF] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer tabular-nums"
          >
            <Grid className="w-3.5 h-3.5 text-[#0A84FF]" />
            <span>All ({technologies.length})</span>
          </button>
        </div>
      </div>

      {directoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-[2px]">
          <div className="w-full max-w-5xl max-h-[88vh] flex flex-col rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-popover)] overflow-hidden">
            <div className="px-4 sm:px-6 py-3.5 border-b border-[var(--border-default)] flex items-start sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-bold tabular-nums">
                  Complete Technology Directory ({technologies.length})
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Search by name, category, or aliases (e.g. k8s, golang, postgres, tailwind).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDirectoryOpen(false)}
                aria-label="Close technology directory"
                className="p-2 rounded-lg border border-[var(--border-default)] hover:bg-[var(--bg-subtle)] shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 sm:px-6 py-3 border-b border-[var(--border-default)] bg-[var(--bg-subtle)] flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  placeholder="Filter by technology name, alias, topic, or category..."
                  className="bc-input w-full pl-9 pr-3"
                />
              </div>
              <select
                aria-label="Filter directory by availability status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="bc-select text-xs font-medium w-full sm:w-auto"
              >
                <option value="all">All Statuses</option>
                <option value="available">Available Courses</option>
                <option value="in_development">In Development</option>
                <option value="coming_soon">Coming Soon</option>
              </select>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredDirectory.slice(0, 180).map((tech) => {
                const status =
                  tech.learning_status ||
                  (Number(tech.course_count || 0) > 0 ? 'available' : tech.content_status || 'coming_soon');
                const statusLabel =
                  status === 'available'
                    ? `${tech.course_count} course${Number(tech.course_count) > 1 ? 's' : ''}`
                    : status === 'in_development'
                    ? 'In Development'
                    : 'Coming Soon';

                return (
                  <button
                    key={tech.id}
                    type="button"
                    onClick={() => {
                      setDirectoryOpen(false);
                      onSelectTechnology(tech.slug);
                    }}
                    className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer flex items-start gap-3 ${
                      activeSlug === tech.slug
                        ? 'border-[#0A84FF] bg-[var(--accent-soft)]'
                        : 'border-[var(--border-default)] hover:border-[#0A84FF]/60 bg-[var(--bg-surface)]'
                    }`}
                  >
                    <TechGlyph
                      slug={tech.slug}
                      name={tech.name}
                      symbol={tech.icon_symbol}
                      brandColor={tech.brand_color}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm truncate">{tech.name}</span>
                        <span
                          className={`text-[11px] font-medium shrink-0 tabular-nums ${
                            status === 'available'
                              ? 'text-[var(--status-success)]'
                              : status === 'in_development'
                              ? 'text-[var(--status-warning)]'
                              : 'text-[var(--text-muted)]'
                          }`}
                        >
                          {statusLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                        {tech.category_name} · {tech.difficulty || 'Beginner'}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{tech.description}</p>
                    </div>
                  </button>
                );
              })}
              {filteredDirectory.length === 0 && (
                <div className="col-span-full py-12 text-center text-sm text-[var(--text-muted)]">
                  No technologies match &quot;{filterText}&quot;.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
