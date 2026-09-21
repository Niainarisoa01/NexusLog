"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useEventStore } from "@/store/eventStore";
import { EventLevel } from "@/types/models";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import FilterListOffIcon from "@mui/icons-material/FilterListOff";
import { useTheme } from "@mui/material/styles";

const LEVELS: EventLevel[] = ["Critical", "Error", "Warning", "Information", "Verbose"];

export function FilterBar() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { filter, setFilter, clearFilter, totalEventsCount, filteredEventsCount } = useEventStore();

  const [searchInput, setSearchInput] = useState(filter.search_text || "");
  const [prevSearchText, setPrevSearchText] = useState(filter.search_text);

  if (filter.search_text !== prevSearchText) {
    setPrevSearchText(filter.search_text);
    setSearchInput(filter.search_text || "");
  }

  // Debounce search text updates to backend
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentQuery = filter.search_text || "";
      const trimmed = searchInput.trim();
      if (trimmed !== currentQuery) {
        setFilter({
          ...filter,
          search_text: trimmed.length > 0 ? trimmed : null,
        });
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchInput, filter, setFilter]);

  const handleToggleLevel = (level: EventLevel) => {
    const currentLevels = filter.levels || [];
    let newLevels: EventLevel[];

    if (currentLevels.includes(level)) {
      newLevels = currentLevels.filter((l) => l !== level);
    } else {
      newLevels = [...currentLevels, level];
    }

    setFilter({
      ...filter,
      levels: newLevels.length > 0 ? newLevels : null,
    });
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setFilter({
      ...filter,
      search_text: null,
    });
  };

  const hasActiveFilters = Boolean(
    (filter.levels && filter.levels.length > 0) ||
    (filter.search_text && filter.search_text.trim().length > 0) ||
    (filter.event_ids && filter.event_ids.length > 0) ||
    (filter.providers && filter.providers.length > 0)
  );

  const getChipStyle = (level: EventLevel, isSelected: boolean) => {
    let baseColor = theme.palette.text.secondary;
    if (level === "Critical" || level === "Error") baseColor = theme.palette.error.main;
    else if (level === "Warning") baseColor = theme.palette.warning.main;
    else if (level === "Information") baseColor = theme.palette.primary.main;

    if (isSelected) {
      return {
        bgcolor: `${baseColor}22`,
        color: baseColor,
        borderColor: baseColor,
        fontWeight: 600,
      };
    }

    return {
      bgcolor: "transparent",
      color: "text.secondary",
      borderColor: "divider",
      "&:hover": {
        bgcolor: "action.hover",
      },
    };
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        px: 3,
        py: 1.5,
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      {/* Left controls: Search & Level Chips */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
        <TextField
          variant="outlined"
          size="small"
          placeholder={t("filters.searchPlaceholder", "Search logs...")}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          sx={{ width: 260 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
              </InputAdornment>
            ),
            endAdornment: searchInput ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={handleClearSearch}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />

        {/* Level Filters */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
          {LEVELS.map((level) => {
            const isSelected = Boolean(filter.levels?.includes(level));
            return (
              <Chip
                key={level}
                label={t(`levels.${level.toLowerCase()}`, level)}
                size="small"
                variant={isSelected ? "filled" : "outlined"}
                onClick={() => handleToggleLevel(level)}
                sx={{
                  borderRadius: 1,
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  ...getChipStyle(level, isSelected),
                }}
              />
            );
          })}
        </Box>

        {/* Clear Filters button */}
        {hasActiveFilters && (
          <Button
            size="small"
            variant="text"
            color="secondary"
            startIcon={<FilterListOffIcon fontSize="small" />}
            onClick={() => {
              setSearchInput("");
              clearFilter();
            }}
            sx={{ textTransform: "none", fontSize: "0.8rem" }}
          >
            {t("filters.clear", "Clear Filters")}
          </Button>
        )}
      </Box>

      {/* Right side: Count indicator */}
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
          {filteredEventsCount !== null && filteredEventsCount !== totalEventsCount
            ? t("eventTable.filteredEvents", {
                filtered: filteredEventsCount.toLocaleString(),
                total: totalEventsCount.toLocaleString(),
                defaultValue: `${filteredEventsCount.toLocaleString()} of ${totalEventsCount.toLocaleString()} events`,
              })
            : t("eventTable.totalEvents", {
                count: totalEventsCount.toLocaleString(),
                defaultValue: `${totalEventsCount.toLocaleString()} events`,
              })}
        </Typography>
      </Box>
    </Box>
  );
}
