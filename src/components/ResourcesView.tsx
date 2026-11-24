import React, { useEffect, useState } from 'react';
import { BookOpen, Download, Search, Video } from 'lucide-react';
import { api } from '../lib/api';
import type { ResourceItem } from '../types';

export function ResourcesView() {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selected, setSelected] = useState<ResourceItem | null>(null);

  const loadResources = () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (typeFilter) params.set('type', typeFilter);
    api
      .get<{ resources: ResourceItem[] }>(`/resources?${params.toString()}`)
      .then((d) => {
        setResources(d.resources);
        if (!selected && d.resources[0]) setSelected(d.resources[0]);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadResources();
  }, [typeFilter]);

  const downloadResource = (res: ResourceItem) => {
    const content = `${res.title}\nCategory: ${res.category} (${res.technology})\n\n${res.summary}\n\n${res.content_markdown}\n\n${
      res.code_snippet ? `Code Example:\n${res.code_snippet}` : ''
    }`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = res.downloadable_filename || `${res.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Technical Resources &amp; Platform Guides</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Search programming documentation, architecture references, downloadable notes, and Braincode feature walkthroughs.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadResources();
          }}
          className="flex gap-2 w-full sm:w-auto"
        >
          <div className="relative flex-1 min-w-0 sm:flex-initial">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documentation..."
              className="bc-input w-full sm:w-60 min-w-0 !pl-9 !text-xs"
            />
          </div>
          <button type="submit" className="bc-btn-primary shrink-0">
            Search
          </button>
        </form>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: '', label: 'All Resources' },
          { id: 'tutorial', label: 'Platform Tutorials' },
          { id: 'docs', label: 'Documentation' },
          { id: 'guide', label: 'Engineering Guides' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTypeFilter(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              typeFilter === t.id
                ? 'bg-[var(--accent-primary)] text-white'
                : 'bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 bc-panel divide-y divide-[var(--border-subtle)] overflow-hidden">
          {resources.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelected(r)}
              className={`w-full text-left p-4 transition-colors cursor-pointer ${
                selected?.id === r.id
                  ? 'bg-[var(--accent-soft)]'
                  : 'hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <p className="text-[11px] text-[var(--text-muted)]">
                {r.category} · {r.technology} · {r.type}
              </p>
              <h2 className="text-sm font-bold mt-1 text-[var(--text-primary)]">{r.title}</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{r.summary}</p>
            </button>
          ))}
        </div>

        <div className="lg:col-span-7 bc-panel p-5 sm:p-8 space-y-5">
          {!selected ? (
            <p className="text-sm text-[var(--text-muted)]">Select a resource to view documentation and examples.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[var(--accent-text)]">
                    {selected.category} · {selected.technology}
                  </p>
                  <h2 className="text-xl font-bold mt-1 text-[var(--text-primary)]">{selected.title}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => downloadResource(selected)}
                  className="bc-btn-secondary !h-9 !px-3.5 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>

              <p className="text-sm text-[var(--text-secondary)]">{selected.summary}</p>

              <div className="bc-subtle-box p-4 text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                {selected.content_markdown}
              </div>

              {selected.code_snippet && (
                <div className="rounded-lg bg-[#090D16] border border-[var(--border-default)] p-4 overflow-x-auto">
                  <pre className="font-mono text-xs text-slate-100">{selected.code_snippet}</pre>
                </div>
              )}

              {selected.type === 'tutorial' && (
                <div className="bc-subtle-box p-4 text-xs text-[var(--text-secondary)] flex items-start gap-2.5">
                  {selected.video_url ? (
                    <>
                      <Video className="w-4 h-4 text-[var(--accent-primary)] shrink-0 mt-0.5" />
                      <a href={selected.video_url} target="_blank" rel="noreferrer" className="text-[var(--accent-text)] hover:underline">
                        Open attached tutorial video walkthrough
                      </a>
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-4 h-4 text-[var(--accent-primary)] shrink-0 mt-0.5" />
                      <span>
                        Interactive text walkthrough. Administrators can attach uploaded video URLs to any platform tutorial from the Admin CMS.
                      </span>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
