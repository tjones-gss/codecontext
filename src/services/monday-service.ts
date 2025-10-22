import axios, { AxiosInstance } from 'axios';
import { MondayItem } from '../types';
import config from '../config';

export class MondayService {
  private client: AxiosInstance | null = null;
  private enabled: boolean;

  constructor() {
    this.enabled = !!config.mondayApiToken;

    if (this.enabled) {
      this.client = axios.create({
        baseURL: config.mondayApiUrl,
        headers: {
          'Content-Type': 'application/json',
          Authorization: config.mondayApiToken!,
        },
      });
    }
  }

  async searchItemsByFile(fileName: string): Promise<MondayItem[]> {
    if (!this.enabled || !this.client) {
      return [];
    }

    try {
      const query = `
        query {
          items_page_by_column_values (
            limit: 10,
            columns: [{column_id: "text", column_values: ["${fileName}"]}]
          ) {
            items {
              id
              name
              url
            }
          }
        }
      `;

      const response = await this.client.post('', { query });

      const items = response.data.data?.items_page_by_column_values?.items || [];

      return items.map((item: any) => ({
        id: item.id,
        name: item.name,
        url: item.url || `https://monday.com/boards/item/${item.id}`,
      }));
    } catch (error) {
      console.error('Error searching Monday.com items:', error);
      return [];
    }
  }

  async searchByQuery(query: string): Promise<MondayItem[]> {
    if (!this.enabled || !this.client) {
      return [];
    }

    try {
      const graphqlQuery = `
        query {
          items_page (
            limit: 10,
            query_params: {
              rules: [{column_id: "name", compare_value: ["${query}"], operator: contains_text}]
            }
          ) {
            items {
              id
              name
              url
            }
          }
        }
      `;

      const response = await this.client.post('', { query: graphqlQuery });

      const items = response.data.data?.items_page?.items || [];

      return items.map((item: any) => ({
        id: item.id,
        name: item.name,
        url: item.url || `https://monday.com/boards/item/${item.id}`,
      }));
    } catch (error) {
      console.error('Error searching Monday.com:', error);
      return [];
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export default new MondayService();
