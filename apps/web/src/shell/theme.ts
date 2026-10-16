export const THEME_KEY = 'ekasatra-theme';

/** Dijalankan sinkron di <head> sebelum cat pertama: pilihan tersimpan, kalau tidak ada ikut sistem. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem('${THEME_KEY}');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='light'}`;
