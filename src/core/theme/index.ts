import type { ThemeConfig } from 'antd'
import type { AppConfig } from '../config'

/** تم antd از روی رنگ‌های پروژه + متغیرهای CSS برای استایل‌های سفارشی */
export function createTheme(t: AppConfig['theme']): ThemeConfig {
  return {
    token: {
      colorPrimary: t.primary,
      colorInfo: t.primary,
      colorSuccess: '#12805C',
      colorSuccessBg: '#ECFDF3',
      colorSuccessBorder: '#ABEFC6',
      colorWarning: '#B7791F',
      colorWarningBg: '#FFFAEB',
      colorWarningBorder: '#FEDF89',
      colorError: '#C0392B',
      colorErrorBg: '#FEF3F2',
      colorErrorBorder: '#FECDCA',
      colorInfoBg: '#EFF6FF',
      colorInfoBorder: '#BFDBFE',
      colorText: '#172033',
      colorTextSecondary: '#667085',
      colorBorder: '#D0D5DD',
      colorBorderSecondary: '#EAECF0',
      colorBgLayout: '#F4F6FA',
      borderRadius: 10,
      borderRadiusLG: 14,
      controlHeight: 38,
      fontFamily: "Vazirmatn, IRANSansX, Tahoma, 'Segoe UI', sans-serif",
      fontSize: 14,
      boxShadowTertiary: '0 1px 2px rgba(16,24,40,.05)',
    },
    components: {
      Layout: { siderBg: t.siderGradient[0], headerBg: 'transparent', bodyBg: '#F4F6FA', headerPadding: 0 },
      Menu: {
        darkItemBg: 'transparent',
        darkSubMenuItemBg: 'transparent',
        darkItemSelectedBg: hexA(t.accent, 0.18),
        darkItemSelectedColor: '#fff',
        darkItemColor: '#C9D6E6',
        darkItemHoverBg: 'rgba(255,255,255,.06)',
        darkGroupTitleColor: '#8FA6C0',
        itemBorderRadius: 10,
        itemHeight: 42,
        iconSize: 17,
      },
      Card: { headerFontSize: 15, paddingLG: 22 },
      Table: {
        headerBg: '#F9FAFB',
        headerColor: '#475467',
        headerSplitColor: 'transparent',
        rowSelectedBg: hexA(t.accent, 0.12),
        rowSelectedHoverBg: hexA(t.accent, 0.18),
        rowHoverBg: '#F9FAFB',
        cellPaddingBlock: 12,
      },
      Button: { fontWeight: 600, primaryShadow: 'none', defaultShadow: 'none' },
      Tabs: { titleFontSize: 14, horizontalItemGutter: 28 },
      Tag: { defaultBg: '#F2F4F7' },
      Segmented: { itemSelectedBg: '#fff' },
      Drawer: { footerPaddingBlock: 14 },
    },
  }
}

/** رنگ hex با شفافیت */
export function hexA(hex: string, alpha: number) {
  const n = parseInt(hex.replace('#', ''), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}

export function applyCssVars(t: AppConfig['theme']) {
  const r = document.documentElement.style
  r.setProperty('--c-primary', t.primary)
  r.setProperty('--c-accent', t.accent)
  r.setProperty('--c-accent-soft', hexA(t.accent, 0.12))
  r.setProperty('--sider-gradient', `linear-gradient(180deg, ${t.siderGradient.join(', ')})`)
}
