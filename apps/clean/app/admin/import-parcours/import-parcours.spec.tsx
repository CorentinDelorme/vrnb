import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ImportParcoursForm } from '../../../components/import-parcours-form';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  fetchMock.mockClear();
});

const GPX_FILE = new File(['<gpx></gpx>'], 'trace.gpx', { type: 'application/gpx+xml' });

describe('ImportParcoursForm', () => {
  it('renders the zones dropdown with the existing zones', () => {
    render(<ImportParcoursForm />);
    const zoneTrigger = screen.getAllByRole('combobox')[0];
    expect(zoneTrigger).not.toBeNull();
    // Default value is the first zone, label is displayed.
    expect(zoneTrigger.textContent).toContain('Bruz Sud');
  });

  it('renders the practice-type dropdown below the zones dropdown', () => {
    render(<ImportParcoursForm />);
    const selects = screen.getAllByRole('combobox');
    const zoneTrigger = selects[0];
    const practiceTrigger = selects[1];
    expect(zoneTrigger).not.toBeNull();
    expect(practiceTrigger).not.toBeNull();
    // Default value is the first practice type, label is displayed.
    expect(practiceTrigger.textContent).toContain('À pied');
  });

  it('renders a multiple GPX file input', () => {
    render(<ImportParcoursForm />);
    const fileInput = screen.getByLabelText('Fichiers GPX') as HTMLInputElement;
    expect(fileInput.type).toBe('file');
    expect(fileInput.hasAttribute('multiple')).toBe(true);
    expect(fileInput.accept).toBe('.gpx');
  });

  it('renders the import button', () => {
    render(<ImportParcoursForm />);
    expect(screen.getByRole('button', { name: 'Importer' })).not.toBeNull();
  });

  it('disables the import button when no GPX file is selected', () => {
    render(<ImportParcoursForm />);
    const button = screen.getByRole('button', { name: 'Importer' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('enables the import button once a GPX file is selected', () => {
    render(<ImportParcoursForm />);
    const fileInput = screen.getByLabelText('Fichiers GPX') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [GPX_FILE] } });
    const button = screen.getByRole('button', { name: 'Importer' }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });

  it('posts the selected zone and the GPX files to the import API on submit', async () => {
    render(<ImportParcoursForm />);
    const fileInput = screen.getByLabelText('Fichiers GPX') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [GPX_FILE] } });

    fireEvent.click(screen.getByRole('button', { name: 'Importer' }));
    await act(async () => {});

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/import-parcours');
    expect(init?.method).toBe('POST');
    const formData = init?.body as FormData;
    // No zone is selected through the dropdown in jsdom, so the default zone is posted.
    expect(formData.get('zoneId')).toBe('bruz-sud');
    const files = formData.getAll('files');
    expect(files).toHaveLength(1);
    expect(files[0]).toBeInstanceOf(File);
  });

  it('displays the import summary with the assigned IDs after import', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ids: ['V16', 'V17'],
        logs: {
          'generate:routes': { stdout: '', stderr: '', ok: true },
          'generate:tours': { stdout: '', stderr: '', ok: true },
          'generate:pdfs': { stdout: '', stderr: '', ok: true },
        },
      }),
    });
    render(<ImportParcoursForm />);
    const fileInput = screen.getByLabelText('Fichiers GPX') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [GPX_FILE] } });
    fireEvent.click(screen.getByRole('button', { name: 'Importer' }));
    await screen.findByText('2 fichiers importés — IDs attribués : V16, V17');
    await screen.findByText('V16');
    await screen.findByText('V17');
  });

  it('marks every assigned Parcours as a success when all scripts succeeded', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ids: ['P14'],
        logs: {
          'generate:routes': { stdout: '', stderr: '', ok: true },
          'generate:tours': { stdout: '', stderr: '', ok: true },
          'generate:pdfs': { stdout: '', stderr: '', ok: true },
        },
      }),
    });
    render(<ImportParcoursForm />);
    const fileInput = screen.getByLabelText('Fichiers GPX') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [GPX_FILE] } });
    fireEvent.click(screen.getByRole('button', { name: 'Importer' }));
    await screen.findByText('1 fichier importé — IDs attribués : P14');
    const successBadge = screen.getByText('Succès');
    expect(successBadge.closest('li')?.textContent).toContain('P14');
  });

  it('marks every assigned Parcours as a failure when a generation script failed', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ids: ['V16'],
        logs: {
          'generate:routes': { stdout: '', stderr: 'échec du routage', ok: false },
          'generate:tours': { stdout: '', stderr: '', ok: false },
          'generate:pdfs': { stdout: '', stderr: '', ok: false },
        },
      }),
    });
    render(<ImportParcoursForm />);
    const fileInput = screen.getByLabelText('Fichiers GPX') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [GPX_FILE] } });
    fireEvent.click(screen.getByRole('button', { name: 'Importer' }));
    await screen.findByText('1 fichier importé — IDs attribués : V16');
    const failureBadge = screen.getByText('Échec');
    expect(failureBadge.closest('li')?.textContent).toContain('V16');
  });

  it('displays collapsible logs per generation script after import', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ids: ['V16'],
        logs: {
          'generate:routes': {
            stdout: 'routage terminé\n[perf] durée totale : 1,2 s',
            stderr: '',
            ok: true,
          },
          'generate:tours': { stdout: '', stderr: 'attention : fichier manquant', ok: true },
          'generate:pdfs': { stdout: 'PDF généré avec succès', stderr: '', ok: true },
        },
      }),
    });
    const { container } = render(<ImportParcoursForm />);
    const fileInput = screen.getByLabelText('Fichiers GPX') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [GPX_FILE] } });
    fireEvent.click(screen.getByRole('button', { name: 'Importer' }));

    await screen.findByText('Logs des scripts de génération');

    // One collapsible per generation script, in pipeline order.
    const items = Array.from(container.querySelectorAll('[data-slot="accordion-item"]'));
    expect(items).toHaveLength(3);
    expect(
      items.map((element) => element.querySelector('[data-slot="accordion-trigger"]')?.textContent),
    ).toEqual(['Tronçons de parcours (start/end)', 'Parcours et catalogue', 'Fiches PDF']);

    // Open every accordion item and verify its stdout/stderr content is
    // revealed. base-ui keeps only one panel's content mounted at a time, so
    // we check each panel immediately after opening it.
    const expectedLogContents = [
      [/routage terminé/, /\[perf\] durée totale : 1,2 s/],
      [/attention : fichier manquant/],
      [/PDF généré avec succès/],
    ];
    for (let i = 0; i < items.length; i++) {
      const trigger = items[i].querySelector('[data-slot="accordion-trigger"]')!;
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      fireEvent.click(trigger);
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      for (const text of expectedLogContents[i]) {
        await screen.findByText(text);
      }
    }
  });
});
