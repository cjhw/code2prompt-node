import Handlebars from "handlebars";

/**
 * 设置Handlebars模板引擎
 * @param templateContent - 模板内容
 * @returns Handlebars实例
 */
export function setupHandlebars(templateContent: string): typeof Handlebars {
  const handlebars = Handlebars.create();
  handlebars.registerPartial("default", templateContent);
  return handlebars;
}

/**
 * 渲染模板
 * @param handlebars - Handlebars实例
 * @param data - 模板数据
 * @returns 渲染后的内容
 */
export function renderTemplate(
  handlebars: typeof Handlebars,
  data: any
): string {
  const template = handlebars.compile("{{> default}}");
  return template(data);
}
