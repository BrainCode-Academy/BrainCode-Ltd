import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { api } from '../lib/api';
import type { Technology, TechnologyDirectoryResponse } from '../types';
import { TechGlyph } from './TechGlyph';

export const DIRECTORY_CATEGORY_CHIPS: Array<{ slug: string; label: string }> = [
  { slug: '', label: 'All Technologies' },
  { slug: 'programming-languages', label: 'Programming Languages' },
  { slug: 'frontend-development', label: 'Frontend Development' },
  { slug: 'backend-development', label: 'Backend Development' },
  { slug: 'frameworks-libraries', label: 'Frameworks & Libraries' },
  { slug: 'databases', label: 'Databases' },
  { slug: 'mobile-development', label: 'Mobile Development' },
  { slug: 'artificial-intelligence', label: 'Artificial Intelligence' },
  { slug: 'data-science', label: 'Data Science' },
  { slug: 'cybersecurity', label: 'Cybersecurity' },
  { slug: 'cloud-devops', label: 'Cloud & DevOps' },
  { slug: 'developer-tools', label: 'Developer Tools' },
  { slug: 'ui-ux-design', label: 'UI/UX & Design' },
  { slug: 'computer-fundamentals', label: 'Computer Fundamentals' },
];

interface TechnologyDirectorySectionProps {
  searchQuery: string;
  onResetSearch: () => void;
  category: string;
  onCategoryChange: (slug: string) => void;
  statusFilter: 'all' | 'available' | 'in_development' | 'coming_soon';
  onStatusFilterChange: (status: 'all' | 'available' | 'in_development' | 'coming_soon') => void;
  limit: number;
  onLimitChange: (limit: number) => void;
  totalCatalogHint?: number;
  onSelectTechnology: (slug: string) => void;
}

export function TechnologyDirectorySection({
  searchQuery,
  onResetSearch,
  category,
  onCategoryChange,
  statusFilter,
  onStatusFilterChange,
  limit,
  onLimitChange,
  totalCatalogHint = 0,
  onSelectTechnology,
}: TechnologyDirectorySectionProps) {
  const [items, setItems] = useState<Technology[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [statusCounts, setStatusCounts] = useState({ available: 0, in_development: 0, coming_soon: 0 });
  const [loading, setLoading] = useState(true);
  const [difficulty, setDifficulty] = useState('');
  const [sort, setSort] = useState<'popular' | 'alpha' | 'recent'>('popular');

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (category) params.set('category', category);
    if (difficulty) params.set('difficulty', difficulty);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    params.set('sort', sort);
    params.set('limit', String(limit));
    params.set('offset', '0');

    const timer = setTimeout(() => {
      api
        .get<TechnologyDirectoryResponse>(`/technologies?${params.toString()}`)
        .then((res) => {
          if (!active) return;
          setItems(res.technologies);
          setTotalCount(res.totalCount);
          setFilteredCount(res.filteredCount);
          setStatusCounts(res.statusCounts);
        })
        .catch(() => {})
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 120);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery, category, difficulty, statusFilter, sort, limit]);

  const resetAll = () => {
    onResetSearch();
    onCategoryChange('');
    setDifficulty('');
    onStatusFilterChange('all');
    onLimitChange(20);
  };

  return (
    <section id="directory" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[var(--border-default)] pb-5">
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Technology Directory</h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] tabular-nums">
            Showing {items.length} of {filteredCount} matching technologies ·{' '}
            {totalCount || totalCatalogHint} total in catalog ·{' '}
            <span className="text-[var(--status-success)] font-medium">
              {statusCounts.available} available courses
            </span>{' '}
            · {statusCounts.in_development} in development · {statusCounts.coming_soon} coming soon
          </p>
        </div>

        {/* Filter & Sort Controls */}
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 text-xs">
          <select
            aria-label="Filter by difficulty"
            value={difficulty}
            onChange={(e) => {
              setDifficulty(e.target.value);
              onLimitChange(24);
            }}
            className="bc-select h-9 text-xs font-medium w-full sm:w-auto"
          >
            <option value="">All Levels</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>

          <select
            aria-label="Filter by availability status"
            value={statusFilter}
            onChange={(e) => {
              onStatusFilterChange(e.target.value as typeof statusFilter);
              onLimitChange(24);
            }}
            className="bc-select h-9 text-xs font-medium w-full sm:w-auto"
          >
            <option value="all">All Statuses</option>
            <option value="available">Available Courses ({statusCounts.available})</option>
            <option value="in_development">In Development ({statusCounts.in_development})</option>
            <option value="coming_soon">Coming Soon ({statusCounts.coming_soon})</option>
          </select>

          <select
            aria-label="Sort technologies"
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="bc-select h-9 text-xs font-medium w-full sm:w-auto"
          >
            <option value="popular">Sort: Most Popular</option>
            <option value="alpha">Sort: A–Z</option>
            <option value="recent">Sort: Recently Added</option>
          </select>

          {(searchQuery || category || difficulty || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={resetAll}
              className="bc-btn-secondary h-9 px-3 text-xs text-[#0A84FF]"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Bar */}
      <div
        role="group"
        aria-label="Directory category filters"
        className="flex flex-wrap items-center gap-2"
      >
        {DIRECTORY_CATEGORY_CHIPS.map((chip) => {
          const active = category === chip.slug;
          return (
            <button
              key={chip.slug || 'all'}
              type="button"
              onClick={() => {
                onCategoryChange(chip.slug);
                onLimitChange(24);
              }}
              className={`h-8 px-3 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                active
                  ? 'border-[#0A84FF] bg-[#0A84FF] text-white'
                  : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[#0A84FF]'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {loading && items.length === 0 ? (
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-[var(--bg-subtle)] animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-10 text-center space-y-3 bg-[var(--bg-surface)]">
          <p className="text-sm font-semibold">No technologies match the active filters.</p>
          <button
            type="button"
            onClick={resetAll}
            className="bc-btn-primary h-9 px-4 text-xs"
          >
            Show All {totalCount || totalCatalogHint} Technologies
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
          {items.map((tech) => {
            const status =
              tech.learning_status ||
              (Number(tech.course_count || 0) > 0 ? 'available' : tech.content_status || 'coming_soon');

            return (
              <button
                key={tech.id}
                type="button"
                onClick={() => onSelectTechnology(tech.slug)}
                className="group p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[#0A84FF] text-left transition-colors flex flex-col justify-between gap-3 cursor-pointer"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <TechGlyph
                      slug={tech.slug}
                      name={tech.name}
                      symbol={tech.icon_symbol}
                      brandColor={tech.brand_color}
                      size="md"
                    />
                    <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[#0A84FF] transition-colors shrink-0 mt-1" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[#0A84FF] transition-colors truncate">
                      {tech.name}
                    </h3>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 line-clamp-2 leading-relaxed">
                      {tech.description}
                    </p>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-[var(--border-subtle)] space-y-1 text-[11px]">
                  <p className="text-[var(--text-muted)] truncate">
                    {tech.category_name} · {tech.difficulty || 'Beginner'}
                  </p>
                  <p
                    className={`font-semibold tabular-nums ${
                      status === 'available'
                        ? 'text-[var(--status-success)]'
                        : status === 'in_development'
                        ? 'text-[var(--status-warning)]'
                        : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {status === 'available'
                      ? `Available · ${tech.course_count} course${Number(tech.course_count) > 1 ? 's' : ''}`
                      : status === 'in_development'
                      ? 'In Development'
                      : 'Coming Soon'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Progressive Load More & View All */}
      {items.length < filteredCount && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => onLimitChange(Math.min(filteredCount, limit + 25))}
            className="bc-btn-primary h-10 px-5 text-xs tabular-nums"
          >
            Load More ({Math.min(25, filteredCount - items.length)} more)
          </button>
          <button
            type="button"
            onClick={() => onLimitChange(300)}
            className="bc-btn-secondary h-10 px-5 text-xs tabular-nums"
          >
            View All ({filteredCount})
          </button>
        </div>
      )}
    </section>
  );
}
