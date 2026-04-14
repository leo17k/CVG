import TablaUsuarios from "../Componets/Users/TablaUsuarios";

export default function User() {
    const loading = false;
    return (
        <>
            <Nav />
            <Bg />
            <Sidebar />

            <div className="z-10 ml-[60px] max-lg:ml-0 md:h-[calc(100dvh-60px)] h-auto bg-gray-50 flex overflow-hidden">

                <div className="grid max-lg:flex max-lg:flex-col   max-lg:pb-40 overflow-hidden h-screen max-lg:overflow-y-auto  z-10 grid-cols-5 grid-rows-10 gap-2  w-full p-2 iten  ">

                    <div className="col-start-1  col-end-4 row-start-1 row-end-10 relative max-lg:calc(90vh-140px)] flex flex-col pt-3">
                        {loading && (
                            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-20 flex items-center justify-center">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-blue-600 font-bold text-xs tracking-widest uppercase">Cargando...</span>
                                </div>
                            </div>
                        )}



                        <TablaUsuarios
                            gerencias={[]}
                            loading={false}
                        />


                    </div>
                    <div className="col-start-4 relative col-end-6 row-start-1 row-end-10 flex flex-col w-full overflow-visible  bg-white/50 gap-4 rounded-2xl shadow-lg p-4">



                    </div>
                </div>
            </div>
        </>
    );
}