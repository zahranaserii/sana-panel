import type { ThemeConfig } from 'antd'

/** رنگ‌ها از نسخه HTML گرفته شده‌اند */
export const colors = {
  navy: '#0E2B47',
  navy2: '#17406A',
  navy3: '#0A2239',
  gold: '#C99A2E',
  goldLight: '#E8C56A',
  bg: '#F3F5F9',
  line: '#E3E8F0',
  ink: '#172033',
  inkSoft: '#667085',
  danger: '#C0392B',
  ok: '#12805C',
}

export const theme: ThemeConfig = {
  token: {
    colorPrimary: colors.navy,
    colorLink: colors.navy2,
    colorError: colors.danger,
    colorSuccess: colors.ok,
    colorSuccessBg: '#ECFDF3',
    colorSuccessBorder: '#ABEFC6',
    colorInfoBg: '#EFF6FF',
    colorInfoBorder: '#BFDBFE',
    colorWarningBg: '#FFFAEB',
    colorWarningBorder: '#FEDF89',
    colorErrorBg: '#FEF3F2',
    colorErrorBorder: '#FECDCA',
    colorWarning: '#B7791F',
    colorText: colors.ink,
    colorTextSecondary: colors.inkSoft,
    colorBorderSecondary: colors.line,
    colorBgLayout: colors.bg,
    borderRadius: 10,
    fontFamily: "Vazirmatn, IRANSansX, Tahoma, 'Segoe UI', sans-serif",
    fontSize: 14,
  },
  components: {
    Layout: { siderBg: colors.navy3, headerBg: '#ffffffee', bodyBg: colors.bg },
    Menu: {
      darkItemBg: 'transparent',
      darkSubMenuItemBg: 'transparent',
      darkItemSelectedBg: 'rgba(201,154,46,.18)',
      darkItemSelectedColor: '#fff',
      darkItemColor: '#D4DFEC',
      darkGroupTitleColor: '#8FA6C0',
      itemBorderRadius: 10,
    },
    Card: { headerFontSize: 16 },
    Table: {
      headerBg: '#F7F9FC',
      headerColor: '#475467',
      rowSelectedBg: '#FBF3DF',
      rowSelectedHoverBg: '#F6E9C8',
    },
    Button: { fontWeight: 600 },
  },
}
