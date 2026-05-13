export default function DashboardPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Dashboard
        </h1>
        <p className="text-gray-600">
          Acesse o painel pelo link enviado após o cadastro.
        </p>
      </div>
    </div>
  );
}