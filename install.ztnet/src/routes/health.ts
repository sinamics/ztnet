import { Request, Response } from 'express';

//health status for uptime kuma.
export const getHealth = async function(_: Request, res:Response) {
    return res.status(200).send({response: "ok"});
}