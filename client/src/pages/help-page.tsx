import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Rocket, Book, Headset, ChevronRight } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function HelpCenterPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div className="text-center md:text-left">
        <h2 className="text-3xl font-bold tracking-tight font-heading">Central de Ajuda</h2>
        <p className="text-muted-foreground">Encontre respostas e entre em contato com nosso suporte.</p>
      </div>

      <div className="grid gap-8">
        {/* SECTION 1 - PRIMEIROS PASSOS */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Rocket className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold font-heading">Primeiros Passos</h3>
              <p className="text-sm text-muted-foreground">Comece a usar o sistema</p>
            </div>
          </div>
          
          <div className="grid gap-4">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border rounded-lg px-4 bg-card/50">
                <AccordionTrigger className="hover:no-underline">Como cadastrar fornecedores?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-2">
                  <p>1. Vá até o menu "Fornecedores" na barra lateral.</p>
                  <p>2. Clique no botão "Adicionar Fornecedor" no topo da página.</p>
                  <p>3. Preencha o nome do fornecedor e o tipo de serviço prestado.</p>
                  <p>4. Marque se é um serviço recorrente (mensal) para aparecer automaticamente no dashboard.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border rounded-lg px-4 bg-card/50 mt-2">
                <AccordionTrigger className="hover:no-underline">Como registrar um pagamento?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-2">
                  <p>1. No Dashboard (Status), clique na célula correspondente ao fornecedor e mês desejado.</p>
                  <p>2. Ou vá em "Registrar Pagamento" no menu lateral.</p>
                  <p>3. Preencha os dados do pagamento (valor, chave pix, vencimento).</p>
                  <p>4. No passo 2, anexe a fatura (PDF/JPG) e o comprovante de pagamento (JPG).</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="border rounded-lg px-4 bg-card/50 mt-2">
                <AccordionTrigger className="hover:no-underline">Como visualizar histórico?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <p>O menu "Status" apresenta uma matriz de todos os seus fornecedores versus os meses do ano. Células verdes indicam pagamentos realizados. Você pode clicar nelas para ver detalhes e baixar os arquivos anexados.</p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {/* SECTION 2 - GUIAS E TUTORIAIS */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Book className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold font-heading">Guias, Dicas e Tutoriais</h3>
              <p className="text-sm text-muted-foreground">Acelere sua jornada com dicas práticas</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              "Como editar um pagamento?",
              "Como arquivar o ano fiscal?",
              "Como configurar emails?",
              "Dicas para organizar fornecedores"
            ].map((title, idx) => (
              <Card key={idx} className="cursor-pointer hover:bg-muted/50 transition-colors group">
                <CardContent className="p-4 flex items-center justify-between">
                  <span className="font-medium">{title}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* SECTION 3 - SUPORTE */}
        <section>
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-8 flex flex-col items-center text-center space-y-6">
              <div className="p-4 bg-primary/10 rounded-full text-primary">
                <Headset className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold font-heading">Suporte</h3>
                <p className="text-muted-foreground">Precisa de ajuda? Entre em contato conosco</p>
              </div>
              
              <div className="space-y-4 w-full max-w-sm">
                <Button 
                  className="w-full h-12 bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-lg gap-2"
                  onClick={() => window.open('https://wa.me/5511999999999?text=Olá,%20preciso%20de%20ajuda%20com%20o%20Sistema%20de%20Controle%20de%20Pagamentos', '_blank')}
                >
                  Abrir WhatsApp
                </Button>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Horário de atendimento: Seg-Sex, 9h às 18h</p>
                  <p className="text-xs text-muted-foreground">(Atendimento via bot IA com escalonamento para humano se necessário)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
