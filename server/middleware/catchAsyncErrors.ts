import { NextFunction, Request, Response } from "express";

const CatchAsyncError =
    (theFunction: any) => (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(theFunction(req, res, next)).catch(next);
    };

export default CatchAsyncError;
