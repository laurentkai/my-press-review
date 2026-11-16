import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
afterEach(() => vi.unstubAllGlobals());
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../apps/web/src/App";

describe("demo journeys", () => {
  it("filters, opens and returns from an explicitly fictional article", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText(/contenus fictifs/)).toBeInTheDocument();
    await user.click(
      within(
        screen.getByRole("group", { name: "Filtrer par thème" }),
      ).getByRole("button", { name: "Politique" }),
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Filtrer par sujet" }),
      "Présidentielle française",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Rechercher dans la sélection" }),
      "territoires",
    );
    expect(screen.getAllByRole("article")).toHaveLength(1);
    await user.click(
      screen.getByRole("button", {
        name: "Le regard des territoires sur la campagne",
      }),
    );
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Le regard des territoires sur la campagne",
      }),
    ).toHaveFocus();
    expect(
      screen.getByText(/aucune publication originale/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retour à ma revue" }));
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(
      screen.getByRole("button", {
        name: "Le regard des territoires sur la campagne",
      }),
    ).toHaveFocus();
  });
  it("adds and disables a source in memory without making a request", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Mes sources" }));
    await user.click(
      screen.getByRole("button", { name: "Ajouter une source" }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Nom du média" }),
      "Mon média",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Adresse du flux" }),
      "https://example.org/rss",
    );
    await user.click(screen.getByRole("button", { name: "Ajouter à la démo" }));
    expect(screen.getByText("Mon média")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Aucun article ne sera téléchargé",
    );

    await user.click(
      screen.getByRole("button", { name: "La Revue — accueil" }),
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Mes sources" }));
    expect(
      screen.getByRole("heading", { level: 1, name: "Mes sources" }),
    ).toHaveFocus();
    const toggle = screen.getByRole("button", { name: "Désactiver Mon média" });
    await user.click(toggle);
    expect(
      screen.getByRole("button", { name: "Activer Mon média" }),
    ).toHaveAttribute("aria-pressed", "false");
  });
  it("displays an empty result and resets the search", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(
      screen.getByRole("textbox", { name: "Rechercher dans la sélection" }),
      "introuvable",
    );
    expect(
      screen.getByRole("heading", {
        name: "Aucun article dans cette sélection.",
      }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /Réinitialiser les filtres/ }),
    );
    expect(screen.getAllByRole("article")).toHaveLength(6);
  });
  it("does not render private administration forms", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Administration" }));
    const main = screen.getByRole("main");
    expect(
      within(main).getByText("Un accès réservé au Super Admin."),
    ).toBeInTheDocument();
    expect(within(main).queryByRole("textbox")).not.toBeInTheDocument();
  });
  it("returns from the login banner to the edition without a stale article", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ providers: [] }), { status: 200 }),
        ),
    );
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      screen.getByRole("button", {
        name: "Présidentielle : les idées au cœur du débat",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Connexion privée" }));
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Retrouvez vos perspectives.",
      }),
    ).toHaveFocus();
    expect(
      screen.getByRole("button", { name: "Continuer avec Apple" }),
    ).toBeDisabled();
    await user.click(
      screen.getByRole("button", { name: "Retour à la démonstration" }),
    );
    expect(screen.getAllByRole("article")).toHaveLength(6);
    expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
  });
});
