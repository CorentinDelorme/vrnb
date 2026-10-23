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
    const zoneSelect = screen.getByLabelText('Zone') as HTMLSelectElement;
    expect(zoneSelect).not.toBeNull();
    expect(zoneSelect.querySelectorAll('option')).toHaveLength(3);
    expect(Array.from(zoneSelect.options).map((option) => option.text)).toEqual([
      'Bruz Sud',
      'Bruz Vau Gaillard',
      'Bruz Ker Lann',
    ]);
  });

  it('renders the practice-type dropdown below the zones dropdown', () => {
    render(<ImportParcoursForm />);
    const selects = screen.getAllByRole('combobox');
    const zoneSelect = screen.getByLabelText('Zone') as HTMLSelectElement;
    const practiceSelect = screen.getByLabelText('Type de parcours') as HTMLSelectElement;
    expect(selects[0]).toBe(zoneSelect);
    expect(selects[1]).toBe(practiceSelect);
    expect(Array.from(practiceSelect.options).map((option) => option.value)).toEqual(['P', 'V']);
    expect(Array.from(practiceSelect.options).map((option) => option.text)).toEqual([
      'À pied',
      'À vélo',
    ]);
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
    const zoneSelect = screen.getByLabelText('Zone') as HTMLSelectElement;
    fireEvent.change(zoneSelect, { target: { value: 'bruz-ker-lann' } });
    const fileInput = screen.getByLabelText('Fichiers GPX') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [GPX_FILE] } });

    fireEvent.click(screen.getByRole('button', { name: 'Importer' }));
    await act(async () => {});

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/import-parcours');
    expect(init?.method).toBe('POST');
    const formData = init?.body as FormData;
    expect(formData.get('zoneId')).toBe('bruz-ker-lann');
    const files = formData.getAll('files');
    expect(files).toHaveLength(1);
    // jsdom drops the file name/size when building FormData from a form, but a
    // real File entry is attached (browsers preserve it in production).
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
    const details = Array.from(container.querySelectorAll('details'));
    expect(details).toHaveLength(3);
    expect(details.map((element) => element.querySelector('summary')?.textContent)).toEqual([
      'Tronçons de parcours (start/end)',
      'Parcours et catalogue',
      'Fiches PDF',
    ]);

    // Stdout (including the [perf] block) and stderr are rendered in each block.
    await screen.findByText(/\[perf\] durée totale : 1,2 s/);
    await screen.findByText('attention : fichier manquant');
    await screen.findByText('PDF généré avec succès');

    // Clicking a summary toggles the native <details> open state.
    const toursDetails = details[1];
    expect(toursDetails.hasAttribute('open')).toBe(false);
    fireEvent.click(toursDetails.querySelector('summary')!);
    expect(toursDetails.hasAttribute('open')).toBe(true);
  });
});
