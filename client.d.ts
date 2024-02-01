declare interface ImportMeta {
  compileTime: <T>(id: string, props: Record<any, any> | Array<any>) => T
}
