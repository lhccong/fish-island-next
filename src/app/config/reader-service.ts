// Legacy browser reader service configuration, explicitly requested by the user.
export const readerServiceConfig = {
  accessToken:
    import.meta.env.VITE_READER_ACCESS_TOKEN?.trim() || 'congg:8e2d5baf23a6db101eabe8376142d653',
};
