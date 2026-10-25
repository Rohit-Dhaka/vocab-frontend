import { useState } from "react";
import { ImagePlus } from "lucide-react";

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];
const STATUSES = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500";

const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
    {children}
  </label>
);

export default function WordForm({
  initial = null,
  defaultLanguage = "english",
  submitLabel = "Save",
  submitting = false,
  onSubmit,
}) {
  const [form, setForm] = useState({
    language: initial?.language || defaultLanguage,
    word: initial?.word || "",
    hindiMeaning: initial?.hindiMeaning || "",
    englishMeaning: initial?.englishMeaning || "",
    pronunciationEnglish: initial?.pronunciationEnglish || "",
    pronunciationHindi: initial?.pronunciationHindi || "",
    level: initial?.level || "A1",
    status: initial?.status || "not_started",
    progress: initial?.progress ?? 0,
  });
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(initial?.image?.url || "");

  const set = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  // Status badalne par progress automatically adjust hota hai
  const changeStatus = (status) => {
    setForm((prev) => {
      let progress = prev.progress;
      if (status === "not_started") progress = 0;
      else if (status === "done") progress = 100;
      else if (progress < 1 || progress > 99) progress = 50;
      return { ...prev, status, progress };
    });
  };

  // Progress badalne par status automatically adjust hota hai
  const changeProgress = (value) => {
    const progress = Number(value);
    const status =
      progress === 0 ? "not_started" : progress === 100 ? "done" : "in_progress";
    setForm((prev) => ({ ...prev, progress, status }));
  };

  const pickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Image ke saath bhejne ke liye FormData use hota hai
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value));
    if (imageFile) data.append("image", imageFile);

    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Language">
        <div className="grid grid-cols-2 gap-2">
          {["english", "german"].map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => set("language", lang)}
              className={`rounded-xl border py-2.5 text-sm font-medium capitalize ${
                form.language === lang
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Word *">
        <input
          className={inputClass}
          value={form.word}
          maxLength={150}
          required
          onChange={(e) => set("word", e.target.value)}
        />
      </Field>

      <Field label="Hindi meaning *">
        <input
          className={inputClass}
          value={form.hindiMeaning}
          maxLength={500}
          required
          onChange={(e) => set("hindiMeaning", e.target.value)}
        />
      </Field>

      <Field label="English meaning *">
        <input
          className={inputClass}
          value={form.englishMeaning}
          maxLength={500}
          required
          onChange={(e) => set("englishMeaning", e.target.value)}
        />
      </Field>

      <Field label="Pronunciation (English letters)">
        <input
          className={inputClass}
          value={form.pronunciationEnglish}
          maxLength={200}
          onChange={(e) => set("pronunciationEnglish", e.target.value)}
        />
      </Field>

      <Field label="Pronunciation (Hindi)">
        <input
          className={inputClass}
          value={form.pronunciationHindi}
          maxLength={200}
          onChange={(e) => set("pronunciationHindi", e.target.value)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Level">
          <select
            className={inputClass}
            value={form.level}
            onChange={(e) => set("level", e.target.value)}
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Status">
          <select
            className={inputClass}
            value={form.status}
            onChange={(e) => changeStatus(e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label={`Progress: ${form.progress}%`}>
        <input
          type="range"
          min="0"
          max="100"
          value={form.progress}
          onChange={(e) => changeProgress(e.target.value)}
          className="w-full accent-indigo-600"
        />
      </Field>

      <Field label="Image (optional)">
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-500">
          {preview ? (
            <img src={preview} alt="preview" className="h-14 w-14 rounded-lg object-cover" />
          ) : (
            <ImagePlus size={22} />
          )}
          <span>{preview ? "Change image" : "Choose image"}</span>
          <input type="file" accept="image/*" hidden onChange={pickImage} />
        </label>
      </Field>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {submitting ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}