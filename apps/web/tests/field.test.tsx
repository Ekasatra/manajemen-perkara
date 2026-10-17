import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createClientSchema } from '@ekasatra/shared';
import {
  FieldError,
  FormErrorsProvider,
  Label,
  RequiredNote,
  validateWithSchema,
} from '@/components/ui/field';
import { FormDialog } from '@/components/ui/form-dialog';

describe('Label', () => {
  it('isian wajib: bintang merah aria-hidden + teks pembaca layar', () => {
    const html = renderToStaticMarkup(
      <Label htmlFor="nama" required>
        Nama klien
      </Label>,
    );
    expect(html).toContain('for="nama"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('text-danger-fg');
    expect(html).toContain('>*<');
    expect(html).toContain('wajib diisi');
  });

  it('isian opsional: penanda (opsional) kecil, tanpa bintang', () => {
    const html = renderToStaticMarkup(
      <Label htmlFor="telepon" optional>
        Telepon
      </Label>,
    );
    expect(html).toContain('(opsional)');
    expect(html).not.toContain('aria-hidden="true"');
  });

  it('isian biasa: tanpa penanda apa pun', () => {
    const html = renderToStaticMarkup(<Label htmlFor="x">Judul</Label>);
    expect(html).not.toContain('(opsional)');
    expect(html).not.toContain('wajib diisi');
  });
});

describe('FieldError', () => {
  it('render pesan galat role=alert dengan id err-<name> saat ada di konteks', () => {
    const html = renderToStaticMarkup(
      <FormErrorsProvider errors={{ nama: 'Nama wajib diisi' }}>
        <FieldError name="nama" />
      </FormErrorsProvider>,
    );
    expect(html).toContain('id="err-nama"');
    expect(html).toContain('role="alert"');
    expect(html).toContain('Nama wajib diisi');
  });

  it('render nihil bila tidak ada galat untuk isian itu', () => {
    const html = renderToStaticMarkup(
      <FormErrorsProvider errors={{ lain: 'x' }}>
        <FieldError name="nama" />
      </FormErrorsProvider>,
    );
    expect(html).toBe('');
  });
});

describe('RequiredNote', () => {
  it('menyebut penanda * sebagai wajib diisi', () => {
    const html = renderToStaticMarkup(<RequiredNote />);
    expect(html).toContain('wajib diisi');
    expect(html).toContain('text-danger-fg');
  });
});

describe('validateWithSchema', () => {
  it('mengembalikan kosong saat isian wajib terisi', () => {
    const fd = new FormData();
    fd.set('name', 'PT Uji');
    expect(validateWithSchema(createClientSchema, fd)).toEqual({});
  });

  it('menandai kunci isian wajib yang kosong dengan pesan skema', () => {
    const fd = new FormData();
    const errors = validateWithSchema(createClientSchema, fd);
    expect(errors.name).toBeTruthy();
  });

  it('memotong spasi; string kosong dianggap tidak diisi (keputusan wajib = skema)', () => {
    const fd = new FormData();
    fd.set('name', '   ');
    const errors = validateWithSchema(createClientSchema, fd);
    expect(errors.name).toBeTruthy();
    // Isian opsional yang kosong tidak menghasilkan galat.
    expect(errors.type).toBeUndefined();
  });
});

describe('FormDialog', () => {
  it('form memakai noValidate (validasi klien via skema, bukan galat browser)', () => {
    const html = renderToStaticMarkup(
      <FormDialog open={false} onClose={() => {}} title="Uji" onSubmit={() => {}}>
        <Label htmlFor="a" required>
          A
        </Label>
        <input id="a" name="a" />
      </FormDialog>,
    );
    expect(html).toContain('noValidate');
    expect(html).toContain('Uji');
  });
});
