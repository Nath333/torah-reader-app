/**
 * FamilyTree Component
 * Displays all derived forms from a Hebrew/Aramaic root in a visual tree structure
 *
 * Features:
 * - Visual tree showing verbs, nouns, adjectives from same root
 * - Expandable categories with binyan/pattern grouping
 * - Click-to-lookup any form
 * - Frequency indicators
 * - Attested vs generated form markers
 */

import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import './FamilyTree.css';

// Service imports with fallbacks
let getRootFamilyTree, generateRootForms;
try {
  const service = require('../../services/rootFormsService');
  getRootFamilyTree = service.getRootFamilyTree;
  generateRootForms = service.generateRootForms;
} catch (e) {
  getRootFamilyTree = async () => ({ categories: {}, totalForms: 0 });
  generateRootForms = () => ({ categories: {}, totalForms: 0 });
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Single form item in the tree
 */
const FormItem = memo(function FormItem({ form, onClick, compact }) {
  const handleClick = useCallback(() => {
    onClick?.(form.form);
  }, [form.form, onClick]);

  return (
    <button
      className={`family-tree-form ${form.attested ? 'attested' : 'generated'} ${compact ? 'compact' : ''}`}
      onClick={handleClick}
      dir="rtl"
      title={form.meaning || form.definition || 'Click to look up'}
    >
      <span className="form-word">{form.form}</span>
      {form.tense && !compact && (
        <span className="form-tense">{form.tense}</span>
      )}
      {form.frequency && (
        <span className="form-freq" title={`${form.frequency} occurrences`}>
          {form.frequency > 1000 ? '+++' : form.frequency > 100 ? '++' : form.frequency > 10 ? '+' : ''}
        </span>
      )}
      {form.attested && (
        <span className="form-attested-badge" title={`Attested in ${form.attestedSource || 'dictionaries'}`}>
          *
        </span>
      )}
    </button>
  );
});

/**
 * Binyan/pattern group within a category
 */
const PatternGroup = memo(function PatternGroup({ pattern, forms, binyanInfo, onClick, defaultExpanded }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!forms || forms.length === 0) return null;

  return (
    <div className={`family-tree-pattern ${expanded ? 'expanded' : ''}`}>
      <button
        className="pattern-header"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="pattern-toggle">{expanded ? '−' : '+'}</span>
        <span className="pattern-name">{binyanInfo?.label || pattern}</span>
        {binyanInfo?.hebrew && (
          <span className="pattern-hebrew" dir="rtl">{binyanInfo.hebrew}</span>
        )}
        <span className="pattern-count">{forms.length}</span>
        {binyanInfo?.meaning && (
          <span className="pattern-meaning">({binyanInfo.meaning})</span>
        )}
      </button>

      {expanded && (
        <div className="pattern-forms">
          {forms.map((form, i) => (
            <FormItem
              key={`${form.form}-${i}`}
              form={form}
              onClick={onClick}
              compact={forms.length > 6}
            />
          ))}
        </div>
      )}
    </div>
  );
});

/**
 * Category section (Verbs, Nouns, etc.)
 */
const CategorySection = memo(function CategorySection({ category, onClick, defaultExpanded }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!category?.forms || category.forms.length === 0) return null;

  // Group forms by binyan/pattern for verbs
  const groupedForms = {};
  category.forms.forEach(form => {
    const key = form.binyan || form.pattern || 'other';
    if (!groupedForms[key]) {
      groupedForms[key] = {
        forms: [],
        binyanInfo: form.binyanInfo || category.subcategories?.[key] || { label: key },
      };
    }
    groupedForms[key].forms.push(form);
  });

  const hasSubgroups = Object.keys(groupedForms).length > 1;

  return (
    <div className={`family-tree-category ${expanded ? 'expanded' : ''}`} style={{ '--category-color': category.color }}>
      <button
        className="category-header"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="category-icon">{category.icon}</span>
        <span className="category-label">{category.label}</span>
        <span className="category-hebrew" dir="rtl">{category.hebrewLabel}</span>
        <span className="category-count">{category.forms.length}</span>
        <span className={`category-toggle ${expanded ? 'expanded' : ''}`}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="2" fill="none"/>
          </svg>
        </span>
      </button>

      {expanded && (
        <div className="category-content">
          {hasSubgroups ? (
            Object.entries(groupedForms).map(([key, { forms, binyanInfo }]) => (
              <PatternGroup
                key={key}
                pattern={key}
                forms={forms}
                binyanInfo={binyanInfo}
                onClick={onClick}
                defaultExpanded={forms.length <= 3}
              />
            ))
          ) : (
            <div className="category-forms-flat">
              {category.forms.map((form, i) => (
                <FormItem
                  key={`${form.form}-${i}`}
                  form={form}
                  onClick={onClick}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

/**
 * Visual root node at center of tree
 */
const RootNode = memo(function RootNode({ root, rootInfo, language }) {
  return (
    <div className="family-tree-root">
      <div className="root-circle">
        <span className="root-letters" dir="rtl">{root}</span>
      </div>
      {rootInfo?.base && (
        <div className="root-meaning">{rootInfo.base}</div>
      )}
      {language && (
        <span className={`root-language ${language}`}>{language}</span>
      )}
      {rootInfo?.semanticField && (
        <span className="root-field">{rootInfo.semanticField}</span>
      )}
    </div>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * FamilyTree - Visual display of all forms from a root
 *
 * @param {Object} props
 * @param {string} props.root - The Hebrew/Aramaic root
 * @param {string} [props.language='hebrew'] - Language ('hebrew' or 'aramaic')
 * @param {Function} [props.onFormClick] - Callback when clicking a form
 * @param {boolean} [props.defaultExpanded=true] - Start with categories expanded
 * @param {boolean} [props.compact=false] - Use compact layout
 * @param {string} [props.className=''] - Additional CSS classes
 */
function FamilyTree({
  root,
  language = 'hebrew',
  onFormClick,
  defaultExpanded = true,
  compact = false,
  className = ''
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [treeData, setTreeData] = useState(null);
  const abortControllerRef = useRef(null);

  // Fetch family tree data
  useEffect(() => {
    if (!root) {
      setTreeData(null);
      setIsLoading(false);
      return;
    }

    // Abort any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const fetchTree = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Try async version first (includes attested forms)
        let data;
        try {
          data = await getRootFamilyTree(root, { language });
        } catch (e) {
          // Fall back to sync version
          data = generateRootForms(root, { language });
        }

        if (!abortController.signal.aborted) {
          setTreeData(data);
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          console.error('[FamilyTree] Error:', err);
          setError('Failed to load word forms');
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchTree();

    return () => {
      abortController.abort();
    };
  }, [root, language]);

  // Handle form click
  const handleFormClick = useCallback((word) => {
    onFormClick?.(word);
  }, [onFormClick]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  if (!root) return null;

  // Loading state
  if (isLoading) {
    return (
      <div className={`family-tree loading ${className}`}>
        <div className="family-tree-loading">
          <div className="tree-spinner" />
          <span>Building word family...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`family-tree error ${className}`}>
        <div className="family-tree-error">
          <span className="error-icon">!</span>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  // No data
  if (!treeData || treeData.totalForms === 0) {
    return (
      <div className={`family-tree empty ${className}`}>
        <div className="family-tree-empty">
          <span className="empty-icon">*</span>
          <span>No derived forms found for root {root}</span>
        </div>
      </div>
    );
  }

  const { categories, rootInfo, totalForms } = treeData;

  return (
    <div className={`family-tree ${compact ? 'compact' : ''} ${className}`}>
      {/* Header */}
      <div className="family-tree-header">
        <span className="tree-icon">🌳</span>
        <span className="tree-title">Word Family</span>
        <span className="tree-count">{totalForms} forms</span>
      </div>

      {/* Root node */}
      <RootNode root={root} rootInfo={rootInfo} language={language} />

      {/* Branches */}
      <div className="family-tree-branches">
        {/* Verbs */}
        {categories.verbs && (
          <CategorySection
            category={categories.verbs}
            onClick={handleFormClick}
            defaultExpanded={defaultExpanded}
          />
        )}

        {/* Nouns */}
        {categories.nouns && (
          <CategorySection
            category={categories.nouns}
            onClick={handleFormClick}
            defaultExpanded={defaultExpanded && (categories.verbs?.forms?.length || 0) < 5}
          />
        )}

        {/* Adjectives */}
        {categories.adjectives && (
          <CategorySection
            category={categories.adjectives}
            onClick={handleFormClick}
            defaultExpanded={false}
          />
        )}

        {/* Related */}
        {categories.related && (
          <CategorySection
            category={categories.related}
            onClick={handleFormClick}
            defaultExpanded={false}
          />
        )}
      </div>

      {/* Footer legend */}
      <div className="family-tree-legend">
        <span className="legend-item attested">
          <span className="legend-marker">*</span>
          <span className="legend-label">Attested in dictionaries</span>
        </span>
        <span className="legend-item generated">
          <span className="legend-marker">~</span>
          <span className="legend-label">Generated form</span>
        </span>
      </div>
    </div>
  );
}

export default memo(FamilyTree);
