export default class Store {
    private static data = {};
    
    static getData(): any {
        return this.data;
    }

    static add(key: string, data: any) {
        this.data[key] = data;
    }

    static getProp(key: string) {
        return this.data[key];
    }
}