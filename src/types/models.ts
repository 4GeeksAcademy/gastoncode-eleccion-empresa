export interface Venta {
    producto : string;
    precio : number;
    sucursal : string;
}


interface Insumo {
    tipo : string;
    cantidad : number;
    precio : number;
    sucursal : string;
}

interface Empleado {
    nombre : string;
    apellido : string;
    edad : number;
    funcion : string;
    telefono : number;
    email? : string | undefined;
}

interface Cliente {
    nombre : string;
    apellido : string;
    edad : number;
    telefono? : number | undefined;
    email : string;
    pais? : string | undefined;
}