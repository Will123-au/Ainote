import React, { useRef } from "react";
import { logger } from "../../../../services/logger";
import { addSearchContext, useContextItems } from "../use-context-items";
import { ToolHandlerProps } from "./types";
import { getVaultSearchIndex } from "../services/vault-search-index";

interface SearchArgs {
  query: string;
}

export function SearchHandler({
  toolInvocation,
  handleAddResult,
  app,
}: ToolHandlerProps) {
  const hasFetchedRef = useRef(false);

  const searchNotes = async (query: string) => {
    const MAX_RESULTS = 10;
    return getVaultSearchIndex(app).search(query, MAX_RESULTS);
  };

  React.useEffect(() => {
    const handleSearchNotes = async () => {
      if (!hasFetchedRef.current && !("result" in toolInvocation)) {
        hasFetchedRef.current = true;
        const { query } = toolInvocation.args as SearchArgs;
        
        try {
          const searchResults = await searchNotes(query);
          
          // Add ONLY metadata to context (reference-based, ephemeral)
          // Full content is NOT stored in context
          const contextResults = searchResults;
          addSearchContext(query, contextResults);
          
          // Send same minimal data to AI (metadata only)
          handleAddResult(JSON.stringify(contextResults));
        } catch (error) {
          logger.error("Error searching notes:", error);
          handleAddResult(JSON.stringify({ error: error.message }));
        }
      }
    };

    handleSearchNotes();
  }, [toolInvocation, handleAddResult, app]);

  const searchResults = useContextItems(state => state.searchResults);

  return (
    <div className="text-sm text-[--text-muted]">
      {!("result" in toolInvocation)
        ? "Searching through your notes..."
        : Object.keys(searchResults).length > 0
        ? `Found ${Object.keys(searchResults).length} matching notes`
        : "No files matching that criteria were found"}
    </div>
  );
}
