"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Plug, Trash2 } from "lucide-react";
import WorkspacePage from "@/components/WorkspacePage";

const API = "/api/backend";
type Catalog = { provider: string; label: string; status: string; setup_note: string };
type Integration = { id: number; provider: string; label: string; status: string; created_at: string };

const publicUrls: Record<string, string> = {
  upwork: "https://www.upwork.com/",
  freelancer: "https://www.freelancer.com/",
  kwork: "https://kwork.ru/",
  freelancehunt: "https://freelancehunt.com/",
  fiverr: "https://www.fiverr.com/",
};

export default function IntegrationsPage() {
  const [catalog, setCatalog] = useState<Catalog[]>([]);
  const [items, setItems] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const responses = await Promise.all([
        fetch(API + "/integrations/catalog", { credentials: "include" }),
        fetch(API + "/integrations", { credentials: "include" }),
      ]);
      if (responses.some((response) => response.status === 401)) {
        window.location.assign("/login");
        return;
      }
      const catalogData = await responses[0].json();
      const integrationsData = await responses[1].json();
      if (!responses[0].ok || !responses[1].ok) {
        throw new Error(catalogData.detail ?? integrationsData.detail ?? "Не удалось загрузить подключения.");
      }
      setCatalog(catalogData);
      setItems(integrationsData);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось связаться с API.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function remove(item: Integration) {
    setError("");
    setMessage("");
    try {
      const response = await fetch(API + "/integrations/" + item.id, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail ?? "Не удалось удалить подключение.");
      }
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setMessage("Запись подключения удалена.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось удалить подключение.");
    }
  }

  return (
    <WorkspacePage
      title="Подключения"
      subtitle="Здесь будут появляться реальные подключения к биржам. Пароли от аккаунтов вводить не нужно."
    >
      {error && <div className="sub-alert error" role="alert">{error}</div>}
      {message && <div className="sub-alert" role="status">{message}</div>}

      <section className="content-card">
        <h2><Plug size={16} style={{ verticalAlign: "middle", marginRight: 8 }} />Биржи фриланса</h2>
        <p>
          Список показывает готовность интеграций, а не имитирует подключение. Для каждой площадки
          отдельно реализуем официальный OAuth или другой разрешённый способ авторизации, затем
          проверим получение заказов и доступность отправки откликов.
        </p>
        {loading ? (
          <div className="sub-empty">Загружаем список площадок…</div>
        ) : (
          <div className="sub-list">
            {catalog.map((entry) => {
              const integration = items.find((item) => item.provider === entry.provider);
              const externalUrl = publicUrls[entry.provider];
              return (
                <article className="sub-list-row" key={entry.provider}>
                  <div className="sub-list-main">
                    <strong>{entry.label}</strong>
                    <span>{entry.setup_note}</span>
                    {integration && <span>Запись: {integration.status.replaceAll("_", " ")}</span>}
                  </div>
                  <span className="sub-badge pending">
                    {integration?.status === "connected" ? "Подключено" : "Интеграция в разработке"}
                  </span>
                  {externalUrl && (
                    <a className="sub-button" href={externalUrl} target="_blank" rel="noreferrer">
                      <ExternalLink size={14} /> Открыть биржу
                    </a>
                  )}
                  {integration && (
                    <button className="sub-button danger" type="button" onClick={() => void remove(integration)}>
                      <Trash2 size={14} /> Удалить запись
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="content-card">
        <h2>Безопасность подключения</h2>
        <div className="sub-list">
          <div className="sub-list-row">
            <div className="sub-list-main">
              <strong>Пароли аккаунтов не запрашиваются</strong>
              <span>Подключение будет идти через официальный экран площадки или ограниченный токен, если биржа это поддерживает.</span>
            </div>
          </div>
          <div className="sub-list-row">
            <div className="sub-list-main">
              <strong>Отправка отклика не считается успешной заранее</strong>
              <span>Статус «Отправлен» появится только после подтверждения со стороны биржи.</span>
            </div>
          </div>
        </div>
      </section>
    </WorkspacePage>
  );
}
