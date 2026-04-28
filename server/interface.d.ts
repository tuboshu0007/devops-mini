/**
 * Service configuration interface
 * @interface ServiceItem
 * @property {string} id - Service unique identifier
 * @property {'web'|'java'|'go'|'node'} category - Service category
 * @property {string} name - Service display name
 * @property {number} listen - Service listening port
 * @property {string} start - Path to start batch file
 * @property {string} [webUrl] - Frontend service URL (optional)
 * @property {string} [stop] - Path to stop batch file (optional)
 * @property {string} [restart] - Path to restart batch file (optional)
 * @property {string} [project] - Project name for grouping (optional)
 */

interface ServiceItem {
  id: string;
  category: 'web' | 'java' | 'go' | 'node';
  name: string;
  listen: number;
  start: string;
  webUrl?: string;
  stop?: string;
  restart?: string;
  description?: string;
}


interface ProjectItem {
  id: string;
  name: string;
  description: string;
  webUrl?: string;
  services: ServiceItem[];
}