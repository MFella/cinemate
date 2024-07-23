
type PrismaError = {
    name: string;
    code: string;
    clientVersion: string;
}

export const isPrismaError = (error: any): error is PrismaError => {
    return 'name' in error && 'code' in error && 'clientVersion' in error;
};