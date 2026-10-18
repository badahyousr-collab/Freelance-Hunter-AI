"use client";

import { FormEvent, useEffect, useState } from "react";
import { Save, UserRound } from "lucide-react";
import WorkspacePage from "@/components/WorkspacePage";

const API = "/api/backend";
const paymentOptions = [
  { id: "bank", label: "Банковский перевод или карта" },
  { id: "crypto", label: "Криптовалюта" },
] as const;

type Profile = { display_name: string | null; skills: string[]; languages: string[]; min_budget: number | null; currency: string; payment_preferences: string[]; excluded_keywords: string[] };

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile>({ display_name: "", skills: [], languages: ["ru", "en"], min_budget: null, currency: "USD", payment_preferences: [], excluded_keywords: [] });
  const [skills, setSkills] = useState("");
  const [languages, setLanguages] = useState("ru, en");
  const [payments, setPayments] = useState<string[]>([]);
  const [excluded, setExcluded] = useState("");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(API + "/profile", { credentials: "include" }).then(async response => {
      if (response.status === 401) { window.location.assign("/login"); return null; }
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail ?? "Не удалось загрузить профиль");
      return data;
    }).then(data => {
      if (!active || !data) return;
      setProfile(data);
      setName(data.display_name ?? "");
      setSkills((data.skills ?? []).join(", "));
      setLanguages((data.languages ?? ["ru", "en"]).join(", "));
      setPayments((data.payment_preferences ?? []).filter((value: string) => paymentOptions.some(option => option.id === value)));
      setExcluded((data.excluded_keywords ?? []).join(", "));
      setBudget(data.min_budget == null ? "" : String(data.min_budget));
      setCurrency(data.currency ?? "USD");
    }).catch(reason => {
      if (active) setError(reason instanceof Error ? reason.message : "Не удалось подключиться к API");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function togglePayment(value: string) {
    setPayments(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value]);
  }

  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    const parse = (value: string) => value.split(",").map(item => item.trim()).filter(Boolean);
    const minBudget = budget.trim() ? Number(budget) : null;
    if (minBudget !== null && (!Number.isFinite(minBudget) || minBudget < 0)) { setError("Минимальный бюджет должен быть числом не меньше нуля."); setSaving(false); return; }
    try {
      const payload = { display_name: name.trim() || null, skills: parse(skills), languages: parse(languages).map(item => item.toLowerCase()), min_budget: minBudget, currency, payment_preferences: payments, excluded_keywords: parse(excluded).map(item => item.toLowerCase()) };
      const response = await fetch(API + "/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail ?? "Не удалось сохранить профиль");
      setProfile(data); window.dispatchEvent(new Event("profile-updated"));
      setMessage("Настройки сохранены. Агент будет учитывать их при отборе заказов.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось сохранить настройки");
    } finally { setSaving(false); }
  }

  return <WorkspacePage title="Настройки" subtitle="Укажи навыки, языки и условия, подходящие для твоих проектов.">
    {error && <div className="sub-alert error" role="alert">{error}</div>}
    {message && <div className="sub-alert" role="status">{message}</div>}
    <form onSubmit={save}>
      <section className="content-card">
        <h2><UserRound size={16} style={{ verticalAlign: "middle", marginRight: 8 }} />Профессиональный профиль</h2>
        <p>Добавляй реальные навыки: агент использует их для отбора и персонализации откликов.</p>
        <div className="sub-form">
          <div className="sub-form-field"><label htmlFor="display-name">Имя для откликов (необязательно)</label><input id="display-name" className="sub-input" value={name} onChange={event => setName(event.target.value)} placeholder="Как к тебе обращаться" /></div>
          <div className="sub-form-field"><label htmlFor="skills">Навыки и специализация</label><textarea id="skills" className="sub-textarea" value={skills} onChange={event => setSkills(event.target.value)} placeholder="Python, Telegram-боты, Mini Apps, REST API" /><span className="sub-muted">Перечисли через запятую. Совпадение навыков помогает ранжировать объявления.</span></div>
          <div className="sub-form-field"><label htmlFor="languages">Языки объявлений</label><input id="languages" className="sub-input" value={languages} onChange={event => setLanguages(event.target.value)} placeholder="ru, en" /><span className="sub-muted">Укажи коды языков через запятую, например ru, en.</span></div>
        </div>
      </section>
      <section className="content-card">
        <h2>Бюджет и способ оплаты</h2>
        <p>Пустой список способов оплаты означает, что агент не фильтрует заказы по этому признаку.</p>
        <div className="sub-form-grid">
          <div className="sub-form-field"><label htmlFor="min-budget">Минимальный бюджет</label><input id="min-budget" className="sub-input" type="number" min="0" step="any" value={budget} onChange={event => setBudget(event.target.value)} placeholder="Без минимума" /></div>
          <div className="sub-form-field"><label htmlFor="currency">Валюта бюджета</label><select id="currency" className="sub-select" value={currency} onChange={event => setCurrency(event.target.value)}><option value="USD">USD</option><option value="RUB">RUB</option><option value="EUR">EUR</option><option value="KZT">KZT</option><option value="ALL">Все валюты</option></select></div>
          <fieldset className="sub-form-field payment-options">
            <legend>Предпочтительные способы оплаты</legend>
            {paymentOptions.map(option => <label className="payment-option" key={option.id}><input type="checkbox" checked={payments.includes(option.id)} onChange={() => togglePayment(option.id)} />{option.label}</label>)}
            <span className="sub-muted">Если выбрать способ, объявления с другим или нераспознанным способом оплаты будут исключены. Сейчас распознаются банковский перевод/карта и криптовалюта.</span>
          </fieldset>
          <div className="sub-form-field"><label htmlFor="excluded">Исключить слова и фразы</label><input id="excluded" className="sub-input" value={excluded} onChange={event => setExcluded(event.target.value)} placeholder="бесплатно, без оплаты, тестовое задание" /><span className="sub-muted">Эти фразы ищутся в тексте объявления и исключают его из результатов.</span></div>
        </div>
        <div className="settings-save-row"><button className="sub-button primary settings-save-button" type="submit" disabled={saving || loading}><Save size={15} />{saving ? "Сохраняем…" : "Сохранить настройки"}</button></div>
      </section>
    </form>
    {loading && <div className="sub-muted">Загружаем профиль…</div>}
    <section className="content-card">
      <h2>Как агент отбирает проекты</h2>
      <p>Сначала применяются обязательные фильтры. Навыки не отправляются биржам как поисковый запрос: сейчас агент проверяет, встречается ли указанная фраза в названии или описании объявления. Синонимы автоматически не распознаются, поэтому укажи распространённые варианты через запятую.</p>
      <div className="sub-list">
        <div className="sub-list-row"><div className="sub-list-main"><strong>Навыки</strong><span>{profile.skills.length ? profile.skills.join(", ") : "Пока не указаны"}</span></div></div>
        <div className="sub-list-row"><div className="sub-list-main"><strong>Языки</strong><span>{profile.languages.join(", ") || "Не указаны"}</span></div></div>
        <div className="sub-list-row"><div className="sub-list-main"><strong>Способы оплаты</strong><span>{profile.payment_preferences.length ? profile.payment_preferences.map(value => paymentOptions.find(option => option.id === value)?.label ?? value).join(", ") : "Фильтр не применяется"}</span></div></div>
      </div>
    </section>
  </WorkspacePage>;
}
