<script lang="ts">
  import { generateLetterPagesPdfBlob, type DesktopPaperSize } from "$lib";
  import { generateBrotherLabelPdfBlob, type LabelLayout } from "$lib";
  import { generateDesktopPreviewSvg, generateLabelPreviewSvg } from "$lib";
  import { browser } from "$app/environment";
  import { onMount } from "svelte";

  let isGenerating = false;
  let errorMessage: string | null = null;
  let previewErrorMessage: string | null = null;
  let previewSvg: string | null = null;
  let previewKey = "";
  let hasMounted = false;

  let printMode: "desktop" | "label" = "desktop";

  // Desktop printer (US Letter)
  let pageCount = 1;
  let rowSpacingInches = "1";
	let desktopPaperSize: DesktopPaperSize = "letter";

  // Label printer (Brother)
  let labelWidthInches = 2.4;
  let labelLengthInches = 36;
  let labelLayout: LabelLayout = "strip";

  const MIN_LABEL_WIDTH_INCHES = 0.75;
  const MM_PER_INCH = 25.4;

  let unitSystem: "imperial" | "metric" = "imperial";
	let labelWidthDraft = "";
	let labelLengthDraft = "";
	let isEditingLabelWidth = false;
	let isEditingLabelLength = false;
  let lastUnitSystem: "imperial" | "metric" = unitSystem;

  function inchesToMm(inches: number): number {
    return inches * MM_PER_INCH;
  }

  function mmToInches(mm: number): number {
    return mm / MM_PER_INCH;
  }

  function roundTo(value: number, decimals: number): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }

  function formatInchesForUi(inches: number): string {
    if (!Number.isFinite(inches)) return "";
    if (unitSystem === "metric") return String(roundTo(inchesToMm(inches), 1));
    return String(roundTo(inches, 2));
  }

  function parseUiToInches(text: string, units: "imperial" | "metric"): number | null {
    const trimmed = text.trim();
    if (trimmed === "") return null;
    const raw = Number(trimmed);
    if (!Number.isFinite(raw)) return null;
    return units === "metric" ? mmToInches(raw) : raw;
  }

  function labelWidthMinUi(): number {
    return unitSystem === "metric"
      ? roundTo(inchesToMm(MIN_LABEL_WIDTH_INCHES), 1)
      : MIN_LABEL_WIDTH_INCHES;
  }

  function labelLengthMinUi(): number {
    return unitSystem === "metric" ? roundTo(inchesToMm(2), 1) : 2;
  }

  function labelLengthMaxUi(): number {
    return unitSystem === "metric" ? roundTo(inchesToMm(36), 1) : 36;
  }

  function clampLabelWidthInches(value: number): number {
    if (!Number.isFinite(value)) return MIN_LABEL_WIDTH_INCHES;
    return Math.max(MIN_LABEL_WIDTH_INCHES, value);
  }

  function clampLabelLengthInches(value: number): number {
    if (!Number.isFinite(value)) return 36;
    return Math.min(36, Math.max(2, value));
  }

  function onLabelWidthInput(event: Event) {
		const text = (event.target as HTMLInputElement).value;
		labelWidthDraft = text;
		if (text.trim() === "") return;

    const raw = Number(text);
		if (!Number.isFinite(raw)) return;

    const inches = unitSystem === "metric" ? mmToInches(raw) : raw;
    labelWidthInches = inches;
  }

  function onLabelLengthInput(event: Event) {
		const text = (event.target as HTMLInputElement).value;
		labelLengthDraft = text;
		if (text.trim() === "") return;

    const raw = Number(text);
		if (!Number.isFinite(raw)) return;

    const inches = unitSystem === "metric" ? mmToInches(raw) : raw;
    labelLengthInches = inches;
  }

	function commitLabelWidth() {
		labelWidthInches = clampLabelWidthInches(labelWidthInches);
		labelWidthDraft = formatInchesForUi(labelWidthInches);
	}

	function commitLabelLength() {
		labelLengthInches = clampLabelLengthInches(labelLengthInches);
		labelLengthDraft = formatInchesForUi(labelLengthInches);
	}

  const rowSpacingOptions: Array<{ value: string; imperial: string; metric: string }> = [
    { value: "0.125", imperial: '1/8"', metric: `${roundTo(inchesToMm(0.125), 1)} mm` },
    { value: "0.25", imperial: '1/4"', metric: `${roundTo(inchesToMm(0.25), 1)} mm` },
    { value: "0.375", imperial: '3/8"', metric: `${roundTo(inchesToMm(0.375), 1)} mm` },
    { value: "0.5", imperial: '1/2"', metric: `${roundTo(inchesToMm(0.5), 1)} mm` },
    { value: "0.625", imperial: '5/8"', metric: `${roundTo(inchesToMm(0.625), 1)} mm` },
    {
      value: "1",
      imperial: '1" (Workstation / Plate spacing)',
      metric: `${roundTo(inchesToMm(1), 1)} mm (Workstation / Plate spacing)`
    },
    { value: "2", imperial: '2"', metric: `${roundTo(inchesToMm(2), 1)} mm` }
  ];

	$: if (hasMounted && !isEditingLabelWidth) {
		labelWidthDraft = formatInchesForUi(labelWidthInches);
	}

	$: if (hasMounted && !isEditingLabelLength) {
		labelLengthDraft = formatInchesForUi(labelLengthInches);
	}

  $: if (hasMounted && unitSystem !== lastUnitSystem) {
    // Switching units should *convert display* while preserving the underlying meaning.
    // Update label drafts even if the user is currently in Desktop mode,
    // otherwise switching modes will show stale units.

    if (isEditingLabelWidth) {
      const nextWidth = parseUiToInches(labelWidthDraft, lastUnitSystem);
      if (nextWidth !== null) labelWidthInches = nextWidth;
      labelWidthInches = clampLabelWidthInches(labelWidthInches);
      isEditingLabelWidth = false;
    }

    if (isEditingLabelLength) {
      const nextLength = parseUiToInches(labelLengthDraft, lastUnitSystem);
      if (nextLength !== null) labelLengthInches = nextLength;
      labelLengthInches = clampLabelLengthInches(labelLengthInches);
      isEditingLabelLength = false;
    }

    // If not editing, don't re-parse (avoids rounding drift). Just reformat.
    labelWidthDraft = formatInchesForUi(labelWidthInches);
    labelLengthDraft = formatInchesForUi(labelLengthInches);

    lastUnitSystem = unitSystem;
  }

  $: if (hasMounted) {
    // Keep desktop paper sizes aligned to the selected unit system.
    if (unitSystem === "metric" && (desktopPaperSize === "letter" || desktopPaperSize === "legal")) {
      desktopPaperSize = "a4";
    }
    if (unitSystem === "imperial" && (desktopPaperSize === "a4" || desktopPaperSize === "a3")) {
      desktopPaperSize = "letter";
    }
  }

  const desktopPaperOptionsImperial: Array<{ value: DesktopPaperSize; label: string }> = [
    { value: "letter", label: 'US Letter (8.5 × 11 in)' },
    { value: "legal", label: 'US Legal (8.5 × 14 in)' }
  ];

  const desktopPaperOptionsMetric: Array<{ value: DesktopPaperSize; label: string }> = [
    { value: "a4", label: 'A4 (210 × 297 mm)' },
    { value: "a3", label: 'A3 (297 × 420 mm)' }
  ];

  async function onGeneratePdfClick() {
    isGenerating = true;
    errorMessage = null;

    try {
      const blob =
        printMode === "desktop"
				? await generateLetterPagesPdfBlob(pageCount, Number(rowSpacingInches), desktopPaperSize)
          : await generateBrotherLabelPdfBlob({
              labelWidthInches: clampLabelWidthInches(labelWidthInches),
						labelLengthInches: clampLabelLengthInches(labelLengthInches),
              layout: labelLayout,
            });
      const url = URL.createObjectURL(blob);
      window.location.assign(url);
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
    } finally {
      isGenerating = false;
    }
  }

  function updatePreview() {
    // Avoid SSR hydration mismatches caused by random preview content.
    if (!browser) return;

    previewErrorMessage = null;
    try {
      previewSvg =
        printMode === "desktop"
          ? generateDesktopPreviewSvg({
              rowSpacingInches: Number(rowSpacingInches),
				paper: desktopPaperSize
            })
				: generateLabelPreviewSvg({
						labelWidthInches: clampLabelWidthInches(labelWidthInches),
						layout: labelLayout
					});
    } catch (err) {
      previewSvg = null;
      previewErrorMessage = err instanceof Error ? err.message : String(err);
    }
  }

  onMount(() => {
    hasMounted = true;
    previewKey = "";
		labelWidthDraft = formatInchesForUi(labelWidthInches);
		labelLengthDraft = formatInchesForUi(labelLengthInches);
    updatePreview();
  });

  $: if (hasMounted) {
    const nextKey =
      printMode === "desktop"
				? `desktop|paper:${desktopPaperSize}|pages:${pageCount}|spacing:${rowSpacingInches}`
        : `label|w:${labelWidthInches}|len:${labelLengthInches}|layout:${labelLayout}`;
    if (nextKey !== previewKey) {
      previewKey = nextKey;
      updatePreview();
    }
  }
</script>

<main class="bg-body-tertiary min-vh-100 py-4 py-md-5">
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-12 col-md-10 col-lg-7 col-xl-6">
        <div class="card border-0 shadow-sm">
          <div class="card-body p-4 p-md-5">
            <div class="d-flex align-items-start justify-content-between gap-3">
              <div>
                <h1 class="h3 mb-2">Domino Creator</h1>
                <p class="text-secondary mb-0">
                  Pick your printer type, set one or two options, click
                  Generate.
                </p>
              </div>
              <span class="badge text-bg-light border">PDF</span>
            </div>

            <hr class="my-4" />

            <div
              class="btn-group w-100"
              role="group"
              aria-label="Choose printer type"
            >
              <input
                class="btn-check"
                type="radio"
                name="printMode"
                id="modeDesktop"
                value="desktop"
                bind:group={printMode}
                disabled={isGenerating}
              />
              <label class="btn btn-outline-primary btn-lg" for="modeDesktop"
                >Desktop printer</label
              >

              <input
                class="btn-check"
                type="radio"
                name="printMode"
                id="modeLabel"
                value="label"
                bind:group={printMode}
                disabled={isGenerating}
              />
              <label class="btn btn-outline-primary btn-lg" for="modeLabel"
                >Label printer (Brother)</label
              >
            </div>
            <div class="text-secondary small mt-2">
              Desktop = US Letter pages you can cut out. Label printer =
              continuous label PDF sized to your label width.
            </div>

      <div class="mt-3">
        <div class="form-label">Units</div>
        <div class="btn-group w-100" role="group" aria-label="Choose units">
          <input
            class="btn-check"
            type="radio"
            name="unitSystem"
            id="unitsImperial"
            value="imperial"
            bind:group={unitSystem}
            disabled={isGenerating}
          />
          <label class="btn btn-outline-secondary btn-lg" for="unitsImperial">Imperial (in)</label>

          <input
            class="btn-check"
            type="radio"
            name="unitSystem"
            id="unitsMetric"
            value="metric"
            bind:group={unitSystem}
            disabled={isGenerating}
          />
          <label class="btn btn-outline-secondary btn-lg" for="unitsMetric">Metric (mm)</label>
        </div>
        <div class="text-secondary small mt-2">Applies to spacing and label dimensions.</div>
      </div>

            <div class="mt-4">
              {#if printMode === "desktop"}
                <div class="row g-3">
          <div class="col-12">
            <label class="form-label" for="desktopPaperSize">
              {unitSystem === "metric" ? "Paper size (metric)" : "Paper size"}
            </label>
            <select
              id="desktopPaperSize"
              class="form-select form-select-lg"
              disabled={isGenerating}
              bind:value={desktopPaperSize}
            >
              {#if unitSystem === "metric"}
                {#each desktopPaperOptionsMetric as opt}
                  <option value={opt.value}>{opt.label}</option>
                {/each}
              {:else}
                {#each desktopPaperOptionsImperial as opt}
                  <option value={opt.value}>{opt.label}</option>
                {/each}
              {/if}
            </select>
            <div class="form-text">
              {unitSystem === "metric" ? "A-sizes (portrait)." : "US paper sizes (portrait)."}
            </div>
          </div>

                  <div class="col-12 col-sm-6">
                    <label class="form-label" for="pageCount">Pages</label>
                    <input
                      id="pageCount"
                      class="form-control form-control-lg"
                      type="number"
                      min="1"
                      step="1"
                      bind:value={pageCount}
                      disabled={isGenerating}
                    />
						<div class="form-text">How many pages to generate.</div>
                  </div>

                  <div class="col-12 col-sm-6">
                    <label class="form-label" for="rowSpacing">
							{unitSystem === "metric" ? "Row spacing (mm)" : "Row spacing"}
						</label>
                    <select
                      id="rowSpacing"
                      class="form-select form-select-lg"
                      disabled={isGenerating}
                      bind:value={rowSpacingInches}
                    >
						{#each rowSpacingOptions as opt}
							<option value={opt.value}>
								{unitSystem === "metric" ? opt.metric : opt.imperial}
							</option>
						{/each}
                    </select>
                    <div class="form-text">
                      Controls the spacing between columns of dominoes.
                    </div>
                  </div>
                </div>
              {:else}
                <div class="row g-3">
                  <div class="col-12 col-sm-6">
                    <label class="form-label" for="labelWidth">
							{printMode === "label" && unitSystem === "metric" ? "Label width (mm)" : "Label width (inches)"}
						</label>
                    <input
                      id="labelWidth"
                      class="form-control form-control-lg"
                      type="number"
                      min={labelWidthMinUi()}
                      step={unitSystem === "metric" ? "1" : "0.1"}
                      value={labelWidthDraft}
                      on:input={onLabelWidthInput}
						on:focus={() => (isEditingLabelWidth = true)}
						on:blur={() => {
							isEditingLabelWidth = false;
							commitLabelWidth();
						}}
						on:change={() => {
							isEditingLabelWidth = false;
							commitLabelWidth();
						}}
                      disabled={isGenerating}
                    />
					<div class="form-text">
            Minimum {unitSystem === "metric" ? `${labelWidthMinUi()} mm` : '0.75"'} (needed to fit a valid domino).
					</div>
                  </div>

                  <div class="col-12 col-sm-6">
                    <label class="form-label" for="labelLength">
							{printMode === "label" && unitSystem === "metric" ? "Label length (mm)" : "Label length (inches)"}
						</label>
                    <input
                      id="labelLength"
                      class="form-control form-control-lg"
                      type="number"
                      min={labelLengthMinUi()}
                      max={labelLengthMaxUi()}
                      step={unitSystem === "metric" ? "5" : "0.5"}
                      value={labelLengthDraft}
                      on:input={onLabelLengthInput}
						on:focus={() => (isEditingLabelLength = true)}
						on:blur={() => {
							isEditingLabelLength = false;
							commitLabelLength();
						}}
						on:change={() => {
							isEditingLabelLength = false;
							commitLabelLength();
						}}
                      disabled={isGenerating}
                    />
					<div class="form-text">
						{#if unitSystem === "metric"}
              Anywhere from {labelLengthMinUi()} mm to {labelLengthMaxUi()} mm.
						{:else}
							Anywhere from 2" to 36".
						{/if}
					</div>
                  </div>

                  <div class="col-12">
                    <div class="form-label">Layout</div>
                    <div
                      class="btn-group w-100"
                      role="group"
                      aria-label="Label layout"
                    >
                      <input
                        class="btn-check"
                        type="radio"
                        name="labelLayout"
                        id="layoutStrip"
                        value="strip"
                        bind:group={labelLayout}
                        disabled={isGenerating}
                      />
                      <label
                        class="btn btn-outline-secondary btn-lg"
                        for="layoutStrip">Simple</label
                      >

                      <input
                        class="btn-check"
                        type="radio"
                        name="labelLayout"
                        id="layoutRows"
                        value="rows"
                        bind:group={labelLayout}
                        disabled={isGenerating}
                      />
                      <label
                        class="btn btn-outline-secondary btn-lg"
                        for="layoutRows">Multiple</label
                      >
                    </div>
                    <div class="form-text">
                      “Multiple” fits more dominoes per inch, but you will need to slit the labels.
                    </div>
                  </div>
                </div>
              {/if}
            </div>

            <div class="mt-4">
              <button
                class="btn btn-primary btn-lg w-100"
                on:click={onGeneratePdfClick}
                disabled={isGenerating}
              >
                {isGenerating
                  ? "Generating…"
                  : printMode === "desktop"
                    ? "Generate Letter PDF"
                    : "Generate Label PDF"}
              </button>
              <div class="form-text">Opens the generated PDF immediately.</div>
            </div>

            {#if previewErrorMessage}
              <div
                class="alert alert-warning mt-4 mb-0"
                role="alert"
                aria-live="polite"
              >
                {previewErrorMessage}
              </div>
            {/if}

            {#if previewSvg}
              <div class="mt-4">
                <div
                  class="d-flex align-items-baseline justify-content-between gap-3 mb-2"
                >
                  <div>
                    <div class="fw-semibold">Preview</div>
                    <div class="text-secondary small">
                      Updates automatically as you change options.
                    </div>
                  </div>
                  <span class="badge text-bg-light border">SVG</span>
                </div>
        <div class="preview-scroll overflow-auto" style="max-height: 60vh;">
          <div
            class="preview border rounded bg-white p-2"
				style={printMode === "label" ? `width: ${clampLabelWidthInches(labelWidthInches)}in;` : ""}
          >
            {@html previewSvg}
          </div>
        </div>
              </div>
            {/if}

            {#if errorMessage}
              <div
                class="alert alert-danger mt-4 mb-0"
                role="alert"
                aria-live="polite"
              >
                {errorMessage}
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
</main>

<style>
  .preview :global(svg) {
    max-width: 100%;
    height: auto;
    display: block;
  }

  .preview-scroll {
    width: 100%;
  }
</style>
